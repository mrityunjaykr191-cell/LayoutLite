/**
 * Local background removal provider.
 * Communicates with the local backend, which forwards removal requests to remove.bg.
 */

import type {
  BackgroundRemovalHealth,
  BackgroundRemovalMode,
  BackgroundRemovalProvider,
  RemoveBackgroundOptions,
} from './types.ts';
import {
  BackgroundRemovalError,
  RemoteConsentRequiredError,
} from './errors.ts';
import { createCombinedSignal } from './signalUtils.ts';

export const DEFAULT_LOCAL_ENDPOINT = 'http://127.0.0.1:8000';
export const DEFAULT_TIMEOUT_MS = 75000;
export const HEALTH_CHECK_TIMEOUT_MS = 3500;

export class LocalBackgroundRemovalProvider implements BackgroundRemovalProvider {
  readonly mode: BackgroundRemovalMode = 'local';
  readonly isRemote: boolean = false;
  readonly endpointUrl: string;
  private readonly getConsent: () => boolean;

  constructor(
    endpointUrl: string = DEFAULT_LOCAL_ENDPOINT,
    getConsent: () => boolean = () => false
  ) {
    this.endpointUrl = endpointUrl;
    this.getConsent = getConsent;
  }

  async checkHealth(options?: {
    externalSignal?: AbortSignal;
    timeoutMs?: number;
  }): Promise<BackgroundRemovalHealth> {
    const timeout = options?.timeoutMs ?? HEALTH_CHECK_TIMEOUT_MS;
    const { signal, cleanup } = createCombinedSignal(timeout, options?.externalSignal);

    try {
      const response = await fetch(`${this.endpointUrl}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          ready: false,
          mode: 'local',
          endpointUrl: this.endpointUrl,
          error: `Local service returned HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        ok: data.status === 'ok',
        ready: Boolean(data.ready),
        mode: 'local',
        endpointUrl: this.endpointUrl,
        model: typeof data.model === 'string' ? data.model : undefined,
        device: typeof data.device === 'string' ? data.device : undefined,
        error: typeof data.error === 'string' ? data.error : undefined,
      };
    } catch (err: unknown) {
      const error = err as Error | undefined;
      if (error?.name === 'AbortError') {
        return {
          ok: false,
          ready: false,
          mode: 'local',
          endpointUrl: this.endpointUrl,
          error: 'Health check timed out or was cancelled',
        };
      }
      return {
        ok: false,
        ready: false,
        mode: 'local',
        endpointUrl: this.endpointUrl,
        error: error?.message || 'Local service unreachable',
      };
    } finally {
      cleanup();
    }
  }

  async removeBackground(
    imageBlob: Blob,
    options: RemoveBackgroundOptions = {}
  ): Promise<Blob> {
    if (!this.getConsent()) {
      throw new RemoteConsentRequiredError();
    }

    const baseUrl = options.baseUrl ?? this.endpointUrl;
    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const { signal, cleanup } = createCombinedSignal(timeout, options.externalSignal);

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
        if (response.status === 429) {
          throw new BackgroundRemovalError(
            errorDetail ? `Rate limit exceeded: ${errorDetail}` : 'Local rate limit exceeded. Please wait a moment.',
            429
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
          errorDetail || `Background removal service error (HTTP ${response.status}).`,
          response.status
        );
      }

      const pngBlob = await response.blob();
      return pngBlob;
    } catch (err: unknown) {
      if (err instanceof BackgroundRemovalError) {
        throw err;
      }

      const error = err as Error | undefined;
      const isAbort = error?.name === 'AbortError';

      if (isAbort && options.externalSignal?.aborted) {
        throw new BackgroundRemovalError(
          'Background removal request was cancelled.',
          0,
          true
        );
      }

      if (isAbort) {
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
}
