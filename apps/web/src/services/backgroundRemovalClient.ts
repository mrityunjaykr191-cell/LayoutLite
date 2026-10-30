/**
 * Backward-compatible facade for interacting with background removal providers.
 * Delegates to the active provider (Local by default, or Remote if consented and selected).
 */

import {
  DEFAULT_LOCAL_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
  HEALTH_CHECK_TIMEOUT_MS,
  LocalBackgroundRemovalProvider,
  providerRegistry,
} from './backgroundRemoval/index.ts';
import type {
  RemoveBackgroundOptions,
  ServiceHealthResult,
} from './backgroundRemoval/index.ts';

export {
  BackgroundRemovalError,
  RemoteConsentRequiredError,
  RemoteNotConfiguredError,
  providerRegistry,
} from './backgroundRemoval/index.ts';

export type {
  BackgroundRemovalMode,
  BackgroundRemovalHealth,
  BackgroundRemovalProvider,
  RemoveBackgroundOptions,
  ServiceHealthResult,
} from './backgroundRemoval/index.ts';

export const DEFAULT_BACKEND_URL = DEFAULT_LOCAL_ENDPOINT;
export { DEFAULT_TIMEOUT_MS, HEALTH_CHECK_TIMEOUT_MS };

/**
 * Check if the background removal microservice is running and ready.
 * By default queries the active provider, or tests a specified baseUrl.
 */
export async function checkServiceHealth(
  baseUrl: string = DEFAULT_BACKEND_URL,
  externalSignal?: AbortSignal,
  timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS
): Promise<ServiceHealthResult> {
  const activeProvider = providerRegistry.getActiveProvider();

  // If the caller explicitly specifies a different baseUrl, test with a dedicated local provider instance
  const provider =
    baseUrl === activeProvider.endpointUrl
      ? activeProvider
      : providerRegistry.getLocalProvider();

  // If testing custom URL directly:
  if (baseUrl !== provider.endpointUrl) {
    const customProvider = new LocalBackgroundRemovalProvider(baseUrl);
    const health = await customProvider.checkHealth({ externalSignal, timeoutMs });
    return {
      ok: health.ok,
      ready: health.ready,
      model: health.model,
      device: health.device,
      error: health.error,
    };
  }

  const health = await provider.checkHealth({ externalSignal, timeoutMs });
  return {
    ok: health.ok,
    ready: health.ready,
    model: health.model,
    device: health.device,
    error: health.error,
  };
}

/**
 * Upload a cropped portrait blob to the active background removal service and return a transparent PNG blob.
 */
export async function removeBackground(
  imageBlob: Blob,
  options: RemoveBackgroundOptions = {}
): Promise<Blob> {
  const provider = providerRegistry.getActiveProvider();
  return provider.removeBackground(imageBlob, options);
}
