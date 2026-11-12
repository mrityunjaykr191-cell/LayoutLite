/**
 * Registry and lifecycle manager for background removal providers.
 * Manages active provider selection and explicit user consent persistence.
 */

import type {
  BackgroundRemovalMode,
  BackgroundRemovalProvider,
} from './types.ts';
import { LocalBackgroundRemovalProvider } from './localProvider.ts';
import { RemoteBackgroundRemovalProvider } from './remoteProvider.ts';

export const STORAGE_KEY_MODE = 'layoutlite_bg_removal_mode';
export const STORAGE_KEY_EXTERNAL_PROCESSING_CONSENT =
  'layoutlite_bg_external_processing_consent';
export const STORAGE_KEY_REMOTE_CONSENT = STORAGE_KEY_EXTERNAL_PROCESSING_CONSENT;

export type RegistryListener = (state: { mode: BackgroundRemovalMode; consent: boolean }) => void;

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage?: Storage }).localStorage!;
  }
  return null;
}

class ProviderRegistry {
  private localProvider: LocalBackgroundRemovalProvider;
  private remoteProvider: RemoteBackgroundRemovalProvider;
  private inMemoryMode: BackgroundRemovalMode = 'remote';
  private inMemoryConsent: boolean = false;
  private listeners: Set<RegistryListener> = new Set();

  constructor() {
    this.localProvider = new LocalBackgroundRemovalProvider(undefined);
    this.remoteProvider = new RemoteBackgroundRemovalProvider({
      getConsent: () => this.hasExternalProcessingConsent(),
    });
    this.hydrateFromStorage();
  }

  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener({ mode: this.inMemoryMode, consent: this.inMemoryConsent });
      } catch {
        // Safe ignore
      }
    }
  }

  private hydrateFromStorage(): void {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      const storedConsent = storage.getItem(STORAGE_KEY_EXTERNAL_PROCESSING_CONSENT);
      this.inMemoryConsent = storedConsent === 'true';

      const storedMode = storage.getItem(STORAGE_KEY_MODE);
      if (storedMode === 'local') {
        this.inMemoryMode = 'local';
      } else {
        // Default to 'remote' (Cloud AI) on first visit
        this.inMemoryMode = 'remote';
      }
    } catch {
      // Storage access restricted or unavailable
      this.inMemoryMode = 'remote';
      this.inMemoryConsent = false;
    }
  }

  getActiveMode(): BackgroundRemovalMode {
    return this.inMemoryMode;
  }

  setActiveMode(mode: BackgroundRemovalMode): void {
    this.inMemoryMode = mode;
    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY_MODE, mode);
      } catch {
        // Safe ignore
      }
    }
    this.notifyListeners();
  }

  hasRemoteConsent(): boolean {
    return this.hasExternalProcessingConsent();
  }

  hasExternalProcessingConsent(): boolean {
    return this.inMemoryConsent;
  }

  setRemoteConsent(consented: boolean): void {
    this.setExternalProcessingConsent(consented);
  }

  setExternalProcessingConsent(consented: boolean): void {
    this.inMemoryConsent = consented;
    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(
          STORAGE_KEY_EXTERNAL_PROCESSING_CONSENT,
          consented ? 'true' : 'false'
        );
      } catch {
        // Safe ignore
      }
    }
    this.notifyListeners();
  }

  isRemoteConfigured(): boolean {
    return this.remoteProvider.isConfigured();
  }

  getLocalProvider(): LocalBackgroundRemovalProvider {
    return this.localProvider;
  }

  getRemoteProvider(): RemoteBackgroundRemovalProvider {
    return this.remoteProvider;
  }

  getProvider(mode: BackgroundRemovalMode): BackgroundRemovalProvider {
    return mode === 'remote' ? this.remoteProvider : this.localProvider;
  }

  getActiveProvider(): BackgroundRemovalProvider {
    return this.getProvider(this.inMemoryMode);
  }

  /**
   * Reset registry state (used for testing isolation).
   */
  reset(): void {
    this.inMemoryMode = 'remote';
    this.inMemoryConsent = false;
    const storage = getStorage();
    if (storage) {
      try {
        storage.removeItem(STORAGE_KEY_MODE);
        storage.removeItem(STORAGE_KEY_EXTERNAL_PROCESSING_CONSENT);
      } catch {
        // Safe ignore
      }
    }
    this.notifyListeners();
  }

  /**
   * Configure custom endpoints (used for testing or custom configurations).
   */
  configureEndpoints(config: {
    localUrl?: string;
    remoteUrl?: string;
    isRemoteConfigured?: boolean;
  }): void {
    if (config.localUrl) {
      this.localProvider = new LocalBackgroundRemovalProvider(config.localUrl);
    }
    if (config.remoteUrl !== undefined || config.isRemoteConfigured !== undefined) {
      this.remoteProvider = new RemoteBackgroundRemovalProvider({
        endpointUrl: config.remoteUrl,
        getConsent: () => this.hasExternalProcessingConsent(),
        isConfigured: config.isRemoteConfigured,
      });
    }
  }
}

export const providerRegistry = new ProviderRegistry();
