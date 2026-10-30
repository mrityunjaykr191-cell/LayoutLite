/**
 * Common types and contracts for LayoutLite background removal providers.
 */

export type BackgroundRemovalMode = 'local' | 'remote';

export interface BackgroundRemovalHealth {
  readonly ok: boolean;
  readonly ready: boolean;
  readonly mode: BackgroundRemovalMode;
  readonly endpointUrl: string;
  readonly model?: string;
  readonly device?: string;
  readonly error?: string;
}

/**
 * Backward-compatibility interface matching legacy ServiceHealthResult.
 */
export interface ServiceHealthResult {
  readonly ok: boolean;
  readonly ready: boolean;
  readonly model?: string;
  readonly device?: string;
  readonly error?: string;
}

export interface RemoveBackgroundOptions {
  readonly externalSignal?: AbortSignal;
  readonly timeoutMs?: number;
  /** Explicit override for baseUrl if a caller specifies a target address */
  readonly baseUrl?: string;
}

export interface BackgroundRemovalProvider {
  readonly mode: BackgroundRemovalMode;
  readonly endpointUrl: string;
  readonly isRemote: boolean;

  checkHealth(options?: {
    externalSignal?: AbortSignal;
    timeoutMs?: number;
  }): Promise<BackgroundRemovalHealth>;

  removeBackground(
    imageBlob: Blob,
    options?: RemoveBackgroundOptions
  ): Promise<Blob>;
}
