/**
 * Client for interacting with the local background removal microservice.
 * Communicates strictly with http://127.0.0.1:8000 with zero external data transmission.
 */

export const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';
export const DEFAULT_TIMEOUT_MS = 30000;
export const HEALTH_CHECK_TIMEOUT_MS = 3500;

export interface ServiceHealthResult {
  readonly ok: boolean;
  readonly ready: boolean;
  readonly model?: string;
  readonly device?: string;
  readonly error?: string;
}

export class BackgroundRemovalError extends Error {
  readonly statusCode: number;
  readonly isCancelled: boolean;

  constructor(message: string, statusCode: number = 0, isCancelled: boolean = false) {
    super(message);
    this.name = 'BackgroundRemovalError';
    this.statusCode = statusCode;
    this.isCancelled = isCancelled;
  }
}

/**
 * Creates an AbortSignal that triggers after timeoutMs or when an external signal triggers.
 */
function createCombinedSignal(timeoutMs: number, externalSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('TIMEOUT'));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  };

  return { signal: controller.signal, cleanup };
}

/**
 * Check if the local background removal microservice is running and ready.
 */
export async function checkServiceHealth(
  baseUrl: string = DEFAULT_BACKEND_URL,
  externalSignal?: AbortSignal,
  timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS
): Promise<ServiceHealthResult> {
  const { signal, cleanup } = createCombinedSignal(timeoutMs, externalSignal);

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        ready: false,
        error: `Service returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      ready: Boolean(data.ready),
      model: typeof data.model === 'string' ? data.model : undefined,
      device: typeof data.device === 'string' ? data.device : undefined,
    };
  } catch (err: unknown) {
    const error = err as Error;
    if (signal.aborted) {
      return { ok: false, ready: false, error: 'Health check timed out or was cancelled' };
    }
    return {
      ok: false,
      ready: false,
      error: error?.message ?? 'Microservice is unreachable',
    };
  } finally {
    cleanup();
  }
}

export interface RemoveBackgroundOptions {
  baseUrl?: string;
  externalSignal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Upload a cropped portrait blob to the local background removal service and return a transparent PNG blob.
 */
export async function removeBackground(
  imageBlob: Blob,
  options: RemoveBackgroundOptions = {}
): Promise<Blob> {
  const baseUrl = options.baseUrl ?? DEFAULT_BACKEND_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, cleanup } = createCombinedSignal(timeoutMs, options.externalSignal);

  const formData = new FormData();
  formData.append('file', imageBlob, 'photo.jpg');

  try {
    const response = await fetch(`${baseUrl}/api/remove-background`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'image/png',
      },
      signal,
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const json = await response.json();
        errorDetail = json.detail || json.error || '';
      } catch {
        // Response was not JSON
      }

      if (response.status === 413) {
        throw new BackgroundRemovalError(
          errorDetail || 'Uploaded photo exceeds the 25 MB limit.',
          413
        );
      }
      if (response.status === 415) {
        throw new BackgroundRemovalError(
          errorDetail || 'Unsupported image format. Only JPEG and PNG are supported.',
          415
        );
      }
      if (response.status === 400) {
        throw new BackgroundRemovalError(
          errorDetail || 'Uploaded photo appears corrupt or invalid.',
          400
        );
      }
      if (response.status === 500) {
        throw new BackgroundRemovalError(
          errorDetail ||
            'Background removal AI failed to isolate the subject. You can keep the original background.',
          500
        );
      }

      throw new BackgroundRemovalError(
        errorDetail || `Background removal failed with status ${response.status}.`,
        response.status
      );
    }

    const pngBlob = await response.blob();
    return pngBlob;
  } catch (err: unknown) {
    if (err instanceof BackgroundRemovalError) {
      throw err;
    }

    const error = err as Error;
    if (options.externalSignal?.aborted) {
      throw new BackgroundRemovalError('Background removal request was cancelled.', 0, true);
    }

    if (signal.aborted) {
      throw new BackgroundRemovalError(
        'Background removal request timed out. Please check that the local service is running or keep your original photo.',
        408
      );
    }

    throw new BackgroundRemovalError(
      `Cannot connect to background removal service at ${baseUrl} (${error?.message ?? 'connection failed'}). Ensure the service is running locally, or click Skip to proceed with your original photo.`,
      503
    );
  } finally {
    cleanup();
  }
}
