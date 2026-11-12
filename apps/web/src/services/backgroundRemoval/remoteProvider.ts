/**
 * Remote background removal provider.
 * Connects to the same-origin Vercel serverless function (/api/remove-background) by default,
 * or an explicitly configured HTTPS backend service (e.g. Google Cloud Run).
 * Strictly requires explicit user consent before transmitting any photo data.
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
  RemoteNotConfiguredError,
} from './errors.ts';
import { createCombinedSignal } from './signalUtils.ts';

export const DEFAULT_REMOTE_TIMEOUT_MS = 75000;
export const REMOTE_HEALTH_CHECK_TIMEOUT_MS = 5000;

export interface RemoteProviderConfig {
  readonly endpointUrl?: string;
  readonly getConsent?: () => boolean;
  readonly isConfigured?: boolean;
}

export class RemoteBackgroundRemovalProvider implements BackgroundRemovalProvider {
  readonly mode: BackgroundRemovalMode = 'remote';
  readonly isRemote: boolean = true;
  readonly endpointUrl: string;
  private readonly getConsent?: () => boolean;
  private readonly _isConfigured: boolean;

  constructor(config: RemoteProviderConfig = {}) {
    const metaEnv =
      typeof import.meta !== 'undefined'
        ? (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
        : undefined;

    // Custom endpoint URL if specified via config or Vite env variable
    const configuredUrl =
      config.endpointUrl !== undefined
        ? config.endpointUrl
        : (metaEnv?.VITE_REMOTE_BG_REMOVER_URL
            ? String(metaEnv.VITE_REMOTE_BG_REMOVER_URL).trim()
            : '');

    this.endpointUrl = configuredUrl ? configuredUrl.trim().replace(/\/+$/, '') : '';
    this.getConsent = config.getConsent;

    // Provider is configured by default for production same-origin (/api/remove-background),
    // unless explicitly disabled or given an empty string in tests
    if (config.isConfigured !== undefined) {
      this._isConfigured = config.isConfigured;
    } else if (config.endpointUrl === '') {
      this._isConfigured = false;
    } else {
      this._isConfigured = true;
    }
  }

  isConfigured(): boolean {
    return this._isConfigured;
  }

  /**
   * Helper to resolve the target URL for an API route.
   * If endpointUrl or customBaseUrl is set, uses `${base}${route}`.
   * Otherwise returns relative `${route}` for same-origin production deployment.
   */
  resolveUrl(route: string, customBaseUrl?: string): string {
    const base = (customBaseUrl !== undefined ? customBaseUrl : this.endpointUrl).trim().replace(/\/+$/, '');
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    return base ? `${base}${cleanRoute}` : cleanRoute;
  }

  async checkHealth(options?: {
    externalSignal?: AbortSignal;
    timeoutMs?: number;
  }): Promise<BackgroundRemovalHealth> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        ready: false,
        mode: 'remote',
        endpointUrl: '',
        error: 'Cloud service endpoint URL is not configured.',
      };
    }

    const timeout = options?.timeoutMs ?? REMOTE_HEALTH_CHECK_TIMEOUT_MS;
    const { signal, cleanup } = createCombinedSignal(timeout, options?.externalSignal);
    const targetUrl = this.resolveUrl('/api/health');

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          ready: false,
          mode: 'remote',
          endpointUrl: this.endpointUrl || '/api/health',
          error: `Cloud service returned HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        ok: data.status === 'ok',
        ready: Boolean(data.ready),
        mode: 'remote',
        endpointUrl: this.endpointUrl || '/api/health',
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
          mode: 'remote',
          endpointUrl: this.endpointUrl || '/api/health',
          error: 'Cloud health check timed out or was cancelled',
        };
      }
      return {
        ok: false,
        ready: false,
        mode: 'remote',
        endpointUrl: this.endpointUrl || '/api/health',
        error: error?.message || 'Cloud service unreachable',
      };
    } finally {
      cleanup();
    }
  }

  async removeBackground(
    imageBlob: Blob,
    options: RemoveBackgroundOptions = {}
  ): Promise<Blob> {
    // 1. Enforce explicit consent check before transmitting photo
    if (this.getConsent && !this.getConsent()) {
      throw new RemoteConsentRequiredError();
    }

    // 2. Validate endpoint configuration
    if (!this.isConfigured() && !options.baseUrl) {
      throw new RemoteNotConfiguredError();
    }

    const targetUrl = this.resolveUrl('/api/remove-background', options.baseUrl);
    const timeout = options.timeoutMs ?? DEFAULT_REMOTE_TIMEOUT_MS;
    const { signal, cleanup } = createCombinedSignal(timeout, options.externalSignal);

    const formData = new FormData();
    formData.append('file', imageBlob, 'photo.jpg');

    try {
      const response = await fetch(targetUrl, {
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
            errorDetail || 'Uploaded photo exceeds the maximum size limit.',
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
            errorDetail ? `Cloud service rate limit reached: ${errorDetail}` : 'Cloud service rate limit reached. Please wait a moment before trying again.',
            429
          );
        }
        if (response.status === 503) {
          throw new BackgroundRemovalError(
            errorDetail || 'Cloud background removal is not configured. Verify REMOVE_BG_API_KEY in Vercel settings.',
            503
          );
        }
        if (response.status === 500) {
          throw new BackgroundRemovalError(
            errorDetail || 'The background removal provider failed to isolate the subject. You can keep your original photo.',
            500
          );
        }

        throw new BackgroundRemovalError(
          errorDetail || `Cloud service error (HTTP ${response.status}).`,
          response.status
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Blob([arrayBuffer], { type: 'image/png' });
    } catch (err: unknown) {
      if (err instanceof BackgroundRemovalError) {
        throw err;
      }

      const error = err as Error | undefined;
      const isAbort = error?.name === 'AbortError';

      if (isAbort && options.externalSignal?.aborted) {
        throw new BackgroundRemovalError(
          'Cloud background removal cancelled by user.',
          0,
          true
        );
      }

      if (isAbort) {
        throw new BackgroundRemovalError(
          'Cloud background removal request timed out. Please try again or keep your original photo.',
          408
        );
      }

      throw new BackgroundRemovalError(
        `Cannot connect to cloud service (${error?.message ?? 'connection failed'}). Check your internet connection or switch to local mode.`,
        0
      );
    } finally {
      cleanup();
    }
  }
}
