import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  providerRegistry,
  STORAGE_KEY_EXTERNAL_PROCESSING_CONSENT,
  STORAGE_KEY_MODE,
  STORAGE_KEY_REMOTE_CONSENT,
} from '../src/services/backgroundRemoval/providerRegistry.ts';
import {
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

describe('Phase 3: Background Removal Mode Selector & Privacy Indicators', () => {
  const headerPath = path.resolve(import.meta.dirname, '../src/components/Header.tsx');
  const footerPath = path.resolve(import.meta.dirname, '../src/components/Footer.tsx');
  const dropzonePath = path.resolve(import.meta.dirname, '../src/components/UploadDropzone.tsx');
  const backgroundStepPath = path.resolve(import.meta.dirname, '../src/components/BackgroundStep.tsx');

  const headerContent = fs.readFileSync(headerPath, 'utf-8');
  const footerContent = fs.readFileSync(footerPath, 'utf-8');
  const dropzoneContent = fs.readFileSync(dropzonePath, 'utf-8');
  const bgStepContent = fs.readFileSync(backgroundStepPath, 'utf-8');

  describe('1. Mode Selection & First-Time Visitor Defaults', () => {
    it('defaults to Local AI on first visit when storage is empty', () => {
      setupTestEnvironment();
      assert.equal(providerRegistry.getActiveMode(), 'local');
      assert.equal(providerRegistry.hasRemoteConsent(), false);
      assert.equal(providerRegistry.getActiveProvider().mode, 'local');
      assert.equal(providerRegistry.getActiveProvider().isRemote, false);
    });

    it('persists mode selection to localStorage', () => {
      const storage = setupTestEnvironment();
      providerRegistry.configureEndpoints({ remoteUrl: 'https://cloud.api.com' });

      providerRegistry.setActiveMode('remote');
      assert.equal(providerRegistry.getActiveMode(), 'remote');
      assert.equal(storage.getItem(STORAGE_KEY_MODE), 'remote');

      providerRegistry.setActiveMode('local');
      assert.equal(providerRegistry.getActiveMode(), 'local');
      assert.equal(storage.getItem(STORAGE_KEY_MODE), 'local');
    });

    it('notifies subscribers reactively when mode or consent changes', () => {
      setupTestEnvironment();
      providerRegistry.configureEndpoints({ remoteUrl: 'https://cloud.api.com' });

      const events: Array<{ mode: string; consent: boolean }> = [];
      const unsubscribe = providerRegistry.subscribe((state) => {
        events.push({ ...state });
      });

      providerRegistry.setActiveMode('remote');
      providerRegistry.setRemoteConsent(true);
      providerRegistry.setActiveMode('local');
      unsubscribe();
      providerRegistry.setActiveMode('remote'); // should not be captured after unsubscribe

      assert.equal(events.length, 3);
      assert.deepEqual(events[0], { mode: 'remote', consent: false });
      assert.deepEqual(events[1], { mode: 'remote', consent: true });
      assert.deepEqual(events[2], { mode: 'local', consent: true });
    });
  });

  describe('2. External Processing Consent & Zero Silent Transmission', () => {
    it('never sends a remote request without explicit consent', async () => {
      setupTestEnvironment();
      providerRegistry.configureEndpoints({ remoteUrl: 'https://cloud.api.com' });
      providerRegistry.setActiveMode('remote');

      let fetchInvoked = false;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchInvoked = true;
        return new Response('{}');
      };

      try {
        const provider = providerRegistry.getActiveProvider();
        let caughtError: unknown = null;
        try {
          await provider.removeBackground(new Blob(['photo']));
        } catch (err: unknown) {
          caughtError = err;
        }

        assert.ok(caughtError instanceof RemoteConsentRequiredError);
        assert.equal(fetchInvoked, false, 'Remote provider must not initiate fetch without consent');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('persists consent to localStorage only when explicitly granted', () => {
      const storage = setupTestEnvironment();
      assert.equal(providerRegistry.hasRemoteConsent(), false);
      assert.equal(storage.getItem(STORAGE_KEY_REMOTE_CONSENT), null);

      providerRegistry.setRemoteConsent(true);
      assert.equal(providerRegistry.hasRemoteConsent(), true);
      assert.equal(storage.getItem(STORAGE_KEY_REMOTE_CONSENT), 'true');
      assert.equal(storage.getItem(STORAGE_KEY_EXTERNAL_PROCESSING_CONSENT), 'true');
    });

    it('allows revoking remote consent immediately', async () => {
      const storage = setupTestEnvironment();
      providerRegistry.configureEndpoints({ remoteUrl: 'https://cloud.api.com' });
      providerRegistry.setActiveMode('remote');

      // Grant consent
      providerRegistry.setRemoteConsent(true);
      assert.equal(providerRegistry.hasRemoteConsent(), true);
      assert.equal(storage.getItem(STORAGE_KEY_REMOTE_CONSENT), 'true');

      // Revoke consent
      providerRegistry.setRemoteConsent(false);
      assert.equal(providerRegistry.hasRemoteConsent(), false);
      assert.equal(storage.getItem(STORAGE_KEY_REMOTE_CONSENT), 'false');

      // Next call must be blocked
      const provider = providerRegistry.getActiveProvider();
      let caughtError: unknown = null;
      try {
        await provider.removeBackground(new Blob(['photo']));
      } catch (err: unknown) {
        caughtError = err;
      }
      assert.ok(caughtError instanceof RemoteConsentRequiredError);
    });

    it('handles unconfigured remote endpoint without transmitting', async () => {
      setupTestEnvironment();
      providerRegistry.configureEndpoints({ remoteUrl: '' });
      providerRegistry.setRemoteConsent(true);

      const remoteProvider = providerRegistry.getRemoteProvider();
      assert.equal(remoteProvider.isConfigured(), false);

      let caughtError: unknown = null;
      try {
        await remoteProvider.removeBackground(new Blob(['photo']));
      } catch (err: unknown) {
        caughtError = err;
      }
      assert.ok(caughtError instanceof RemoteNotConfiguredError);
    });
  });

  describe('3. Local Service Unavailable & Provider Isolation', () => {
    it('reports offline state for local provider without falling back to cloud', async () => {
      setupTestEnvironment();
      providerRegistry.configureEndpoints({
        localUrl: 'http://127.0.0.1:8000',
        remoteUrl: 'https://cloud.api.com',
      });
      providerRegistry.setActiveMode('local');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.ok(url.includes('127.0.0.1:8000'), 'Must only query local endpoint');
        throw new Error('connect ECONNREFUSED');
      };

      try {
        const provider = providerRegistry.getActiveProvider();
        const health = await provider.checkHealth();
        assert.equal(health.ok, false);
        assert.equal(health.ready, false);
        assert.equal(health.mode, 'local');
        // Remains strictly in local mode
        assert.equal(providerRegistry.getActiveMode(), 'local');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('4. BackgroundStep Component UI Contracts', () => {
    it('defines accessible segmented mode selector for local and cloud services', () => {
      assert.ok(bgStepContent.includes('role="radiogroup"'), 'Must define radiogroup for mode selector');
      assert.ok(bgStepContent.includes('role="radio"'), 'Must define radio buttons');
      assert.ok(bgStepContent.includes('Local Service'), 'Must include Local Service option');
      assert.ok(bgStepContent.includes('Cloud Service'), 'Must include Cloud Service option');
      assert.ok(bgStepContent.includes('aria-checked={mode === \'local\'}'), 'Must track active local radio');
      assert.ok(bgStepContent.includes('aria-checked={mode === \'remote\'}'), 'Must track active remote radio');
    });

    it('discloses that local and cloud processing send photos to remove.bg', () => {
      assert.ok(
        bgStepContent.includes('The local service sends your cropped photo to remove.bg over HTTPS for processing.'),
        'Must disclose external processing from the local service'
      );
      assert.ok(
        bgStepContent.includes('The cloud service sends your cropped photo to remove.bg over HTTPS for processing.'),
        'Must disclose external processing from the cloud service'
      );
    });

    it('requires explicit consent before sending a photo to remove.bg', () => {
      assert.ok(bgStepContent.includes('role="dialog"'), 'Must define dialog role for consent modal');
      assert.ok(bgStepContent.includes('aria-modal="true"'), 'Must be modal');
      assert.ok(
        bgStepContent.includes('Allow remove.bg Processing?'),
        'Must have clear consent heading'
      );
      assert.ok(
        bgStepContent.includes('if (!providerRegistry.hasExternalProcessingConsent())'),
        'Must gate processing on consent in both service modes'
      );
      assert.ok(
        bgStepContent.includes('Agree &amp; Remove Background') || bgStepContent.includes('Agree & Remove Background'),
        'Must require affirmative confirmation button'
      );
      assert.ok(bgStepContent.includes('Cancel'), 'Must provide cancellation option');
      assert.ok(bgStepContent.includes('remove.bg processes the photo'), 'Must identify the external provider');
    });

    it('provides a visible way to revoke external processing consent', () => {
      assert.ok(bgStepContent.includes('Revoke Consent'), 'Must include Revoke Consent button');
      assert.ok(bgStepContent.includes('handleRevokeConsent'), 'Must wire revocation handler');
    });

    it('explains local service startup when unavailable without auto-switching', () => {
      assert.ok(bgStepContent.includes('Local Service Not Running'), 'Must alert when local service offline');
      assert.ok(bgStepContent.includes('python run.py'), 'Must instruct user how to start service');
      assert.ok(bgStepContent.includes('Check Again'), 'Must offer check again action');
    });
  });

  describe('5. Global Dynamic Privacy Indicators', () => {
    it('Header discloses remove.bg processing for all modes', () => {
      assert.ok(
        headerContent.includes('Background removal sends photo to remove.bg'),
        'Header must disclose the external provider'
      );
      assert.ok(headerContent.includes('remove.bg'), 'Header must identify the external provider on mobile');
    });

    it('Footer discloses remove.bg processing for all modes', () => {
      assert.ok(
        footerContent.includes('Background removal sends the cropped photo to remove.bg over HTTPS'),
        'Footer must disclose the external provider'
      );
    });

    it('UploadDropzone discloses remove.bg processing', () => {
      assert.ok(
        dropzoneContent.includes('Background removal sends the cropped photo to remove.bg'),
        'UploadDropzone must disclose the external provider'
      );
    });
  });
});
