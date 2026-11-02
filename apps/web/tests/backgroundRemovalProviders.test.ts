import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LocalBackgroundRemovalProvider,
  DEFAULT_LOCAL_ENDPOINT,
} from '../src/services/backgroundRemoval/localProvider.ts';
import {
  RemoteBackgroundRemovalProvider,
} from '../src/services/backgroundRemoval/remoteProvider.ts';
import {
  providerRegistry,
  STORAGE_KEY_MODE,
  STORAGE_KEY_REMOTE_CONSENT,
} from '../src/services/backgroundRemoval/providerRegistry.ts';
import {
  BackgroundRemovalError,
  RemoteConsentRequiredError,
  RemoteNotConfiguredError,
} from '../src/services/backgroundRemoval/errors.ts';

// In-memory mock for localStorage in Node test environment
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

function setupTestEnvironment(): MockLocalStorage {
  const mockStorage = new MockLocalStorage();
  (globalThis as unknown as { localStorage: MockLocalStorage }).localStorage = mockStorage;
  providerRegistry.reset();
  return mockStorage;
}

function assertIsError(err: unknown): asserts err is BackgroundRemovalError {
  assert.ok(err instanceof BackgroundRemovalError, `Expected BackgroundRemovalError but got: ${String(err)}`);
}

describe('Dual Background Removal Architecture', () => {
  describe('LocalBackgroundRemovalProvider', () => {
    it('initializes with local mode and default endpoint', () => {
      setupTestEnvironment();
      const provider = new LocalBackgroundRemovalProvider();
      assert.equal(provider.mode, 'local');
      assert.equal(provider.isRemote, false);
      assert.equal(provider.endpointUrl, DEFAULT_LOCAL_ENDPOINT);
    });

    it('returns healthy status on successful health check', async () => {
      setupTestEnvironment();
      const originalFetch = globalThis.fetch;
      const provider = new LocalBackgroundRemovalProvider();

      globalThis.fetch = async (input) => {
        assert.equal(String(input), 'http://127.0.0.1:8000/api/health');
        return new Response(
          JSON.stringify({ status: 'ok', model: 'u2netp', ready: true, device: 'cpu' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      try {
        const health = await provider.checkHealth();
        assert.equal(health.ok, true);
        assert.equal(health.ready, true);
        assert.equal(health.mode, 'local');
        assert.equal(health.endpointUrl, 'http://127.0.0.1:8000');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles offline local service gracefully', async () => {
      setupTestEnvironment();
      const originalFetch = globalThis.fetch;
      const provider = new LocalBackgroundRemovalProvider();

      globalThis.fetch = async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:8000');
      };

      try {
        const health = await provider.checkHealth();
        assert.equal(health.ok, false);
        assert.equal(health.ready, false);
        assert.ok(health.error?.includes('ECONNREFUSED'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('performs in-memory transparent cutout removal', async () => {
      setupTestEnvironment();
      const originalFetch = globalThis.fetch;
      const provider = new LocalBackgroundRemovalProvider(
        DEFAULT_LOCAL_ENDPOINT,
        () => true
      );
      const testBlob = new Blob(['photo'], { type: 'image/jpeg' });
      const expectedOutput = new Blob(['cutout'], { type: 'image/png' });

      globalThis.fetch = async (input, init) => {
        assert.equal(String(input), 'http://127.0.0.1:8000/api/remove-background');
        assert.equal(init?.method, 'POST');
        return new Response(expectedOutput, { status: 200, headers: { 'Content-Type': 'image/png' } });
      };

      try {
        const result = await provider.removeBackground(testBlob);
        assert.equal(result.type, 'image/png');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('requires explicit consent before sending a photo through the local service', async () => {
      setupTestEnvironment();
      const originalFetch = globalThis.fetch;
      const provider = new LocalBackgroundRemovalProvider();
      let fetchInvoked = false;
      globalThis.fetch = async () => {
        fetchInvoked = true;
        return new Response(new Blob(['cutout']), { status: 200 });
      };

      try {
        let caughtError: unknown = null;
        try {
          await provider.removeBackground(new Blob(['photo']));
        } catch (err: unknown) {
          caughtError = err;
        }

        assert.ok(caughtError instanceof RemoteConsentRequiredError);
        assert.equal(fetchInvoked, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles local rate limiting (HTTP 429)', async () => {
      setupTestEnvironment();
      const originalFetch = globalThis.fetch;
      const provider = new LocalBackgroundRemovalProvider(
        DEFAULT_LOCAL_ENDPOINT,
        () => true
      );

      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', detail: 'Too many requests' }),
          { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
        );
      };

      try {
        let caughtError: unknown = null;
        try {
          await provider.removeBackground(new Blob(['test']));
        } catch (err: unknown) {
          caughtError = err;
        }
        assertIsError(caughtError);
        assert.equal(caughtError.statusCode, 429);
        assert.ok(caughtError.message.toLowerCase().includes('rate limit'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('RemoteBackgroundRemovalProvider', () => {
    it('initializes with remote mode and isRemote true', () => {
      setupTestEnvironment();
      const provider = new RemoteBackgroundRemovalProvider({
        endpointUrl: 'https://bg-remover.a.run.app',
      });
      assert.equal(provider.mode, 'remote');
      assert.equal(provider.isRemote, true);
      assert.equal(provider.endpointUrl, 'https://bg-remover.a.run.app');
      assert.equal(provider.isConfigured(), true);
    });

    it('detects unconfigured remote endpoint', async () => {
      setupTestEnvironment();
      const provider = new RemoteBackgroundRemovalProvider({ endpointUrl: '' });
      assert.equal(provider.isConfigured(), false);

      const health = await provider.checkHealth();
      assert.equal(health.ok, false);
      assert.ok(health.error?.includes('not configured'));

      let caughtError: unknown = null;
      try {
        await provider.removeBackground(new Blob(['photo']));
      } catch (err: unknown) {
        caughtError = err;
      }
      assert.ok(caughtError instanceof RemoteNotConfiguredError);
    });

    it('strictly requires explicit user consent before transmitting photo', async () => {
      setupTestEnvironment();
      let userConsented = false;
      const provider = new RemoteBackgroundRemovalProvider({
        endpointUrl: 'https://bg-remover.a.run.app',
        getConsent: () => userConsented,
      });

      // Attempt removal without consent -> must throw RemoteConsentRequiredError
      let caughtError: unknown = null;
      try {
        await provider.removeBackground(new Blob(['photo']));
      } catch (err: unknown) {
        caughtError = err;
      }
      assert.ok(caughtError instanceof RemoteConsentRequiredError);
      assert.equal((caughtError as RemoteConsentRequiredError).statusCode, 403);
      assert.ok((caughtError as RemoteConsentRequiredError).message.includes('consent'));

      // Now grant explicit consent
      userConsented = true;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        assert.equal(String(input), 'https://bg-remover.a.run.app/api/remove-background');
        return new Response(new Blob(['cloud-cutout'], { type: 'image/png' }), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      };

      try {
        const result = await provider.removeBackground(new Blob(['photo']));
        assert.equal(result.type, 'image/png');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles remote rate limiting (HTTP 429) with clear guidance', async () => {
      setupTestEnvironment();
      const provider = new RemoteBackgroundRemovalProvider({
        endpointUrl: 'https://bg-remover.a.run.app',
        getConsent: () => true,
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', detail: 'Cloud Run quota' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      };

      try {
        let caughtError: unknown = null;
        try {
          await provider.removeBackground(new Blob(['photo']));
        } catch (err: unknown) {
          caughtError = err;
        }
        assertIsError(caughtError);
        assert.equal(caughtError.statusCode, 429);
        assert.ok(caughtError.message.includes('Cloud service rate limit'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('ProviderRegistry & Preference Persistence', () => {
    it('defaults to local mode on first visit with clean storage', () => {
      setupTestEnvironment();
      assert.equal(providerRegistry.getActiveMode(), 'local');
      assert.equal(providerRegistry.hasRemoteConsent(), false);
      const activeProvider = providerRegistry.getActiveProvider();
      assert.equal(activeProvider.mode, 'local');
      assert.equal(activeProvider.isRemote, false);
    });

    it('never silently switches from local to remote', () => {
      setupTestEnvironment();
      providerRegistry.configureEndpoints({ remoteUrl: 'https://remote.api' });
      // Even with remote configured, default is strictly local
      assert.equal(providerRegistry.getActiveMode(), 'local');
      assert.equal(providerRegistry.getActiveProvider().mode, 'local');
    });

    it('persists explicit mode selection and consent to localStorage', () => {
      const storage = setupTestEnvironment();
      providerRegistry.configureEndpoints({ remoteUrl: 'https://remote.api' });

      providerRegistry.setRemoteConsent(true);
      assert.equal(storage.getItem(STORAGE_KEY_REMOTE_CONSENT), 'true');
      assert.equal(providerRegistry.hasRemoteConsent(), true);

      providerRegistry.setActiveMode('remote');
      assert.equal(storage.getItem(STORAGE_KEY_MODE), 'remote');
      assert.equal(providerRegistry.getActiveMode(), 'remote');
      assert.equal(providerRegistry.getActiveProvider().mode, 'remote');
    });

    it('local provider strictly cannot access remote endpoint', () => {
      setupTestEnvironment();
      providerRegistry.configureEndpoints({
        localUrl: 'http://127.0.0.1:8000',
        remoteUrl: 'https://remote.api',
      });

      const localProvider = providerRegistry.getLocalProvider();
      assert.equal(localProvider.mode, 'local');
      assert.equal(localProvider.endpointUrl, 'http://127.0.0.1:8000');
      assert.equal(localProvider.isRemote, false);
      assert.equal((localProvider as unknown as { remoteUrl?: string }).remoteUrl, undefined);
    });
  });
});
