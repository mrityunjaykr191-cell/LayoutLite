import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkServiceHealth,
  removeBackground,
  BackgroundRemovalError,
} from '../src/services/backgroundRemovalClient.ts';

function assertIsError(err: unknown): asserts err is BackgroundRemovalError {
  assert.ok(err instanceof BackgroundRemovalError, `Expected BackgroundRemovalError but got: ${String(err)}`);
}

describe('Background Removal Client', () => {
  it('identifies healthy local service response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, _init) => {
      const url = String(input);
      assert.ok(url.includes('http://127.0.0.1:8000/api/health'));
      return new Response(
        JSON.stringify({
          status: 'ok',
          model: 'u2netp',
          ready: true,
          device: 'cpu',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const result = await checkServiceHealth('http://127.0.0.1:8000');
      assert.equal(result.ok, true);
      assert.equal(result.ready, true);
      assert.equal(result.model, 'u2netp');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles service offline cleanly on health check', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8000');
    };

    try {
      const result = await checkServiceHealth('http://127.0.0.1:8000');
      assert.equal(result.ok, false);
      assert.equal(result.ready, false);
      assert.ok(result.error?.includes('ECONNREFUSED'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sends multipart POST to local endpoint and receives transparent PNG blob', async () => {
    const originalFetch = globalThis.fetch;
    const testInputBlob = new Blob(['fake-jpeg-data'], { type: 'image/jpeg' });
    const expectedOutputBlob = new Blob(['fake-transparent-png-data'], { type: 'image/png' });

    let receivedUrl = '';
    let receivedMethod = '';

    globalThis.fetch = async (input, init) => {
      receivedUrl = String(input);
      receivedMethod = init?.method ?? '';
      assert.equal(init?.headers && (init.headers as Record<string, string>)['Accept'], 'image/png');

      return new Response(expectedOutputBlob, {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    };

    try {
      const result = await removeBackground(testInputBlob, {
        baseUrl: 'http://127.0.0.1:8000',
      });
      assert.equal(receivedUrl, 'http://127.0.0.1:8000/api/remove-background');
      assert.equal(receivedMethod, 'POST');
      assert.equal(result.type, 'image/png');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles 413 Payload Too Large with user-friendly message', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ error: 'File too large', detail: 'Maximum upload size is 25 MB.' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      let caughtError: BackgroundRemovalError | null = null;
      try {
        await removeBackground(new Blob(['too big']), { baseUrl: 'http://127.0.0.1:8000' });
      } catch (err: unknown) {
        caughtError = err as BackgroundRemovalError;
      }
      assertIsError(caughtError);
      assert.equal(caughtError.statusCode, 413);
      assert.ok(caughtError.message.includes('25 MB'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles 415 Unsupported Media Type', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ error: 'Unsupported format', detail: 'Only JPEG and PNG are allowed.' }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      let caughtError: BackgroundRemovalError | null = null;
      try {
        await removeBackground(new Blob(['gif']), { baseUrl: 'http://127.0.0.1:8000' });
      } catch (err: unknown) {
        caughtError = err as BackgroundRemovalError;
      }
      assertIsError(caughtError);
      assert.equal(caughtError.statusCode, 415);
      assert.ok(caughtError.message.includes('JPEG and PNG'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles 500 inference failure without leaking server details', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          error: 'Background removal failed',
          detail: 'Model inference failed to isolate subject.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      let caughtError: BackgroundRemovalError | null = null;
      try {
        await removeBackground(new Blob(['bad image']), { baseUrl: 'http://127.0.0.1:8000' });
      } catch (err: unknown) {
        caughtError = err as BackgroundRemovalError;
      }
      assertIsError(caughtError);
      assert.equal(caughtError.statusCode, 500);
      assert.ok(caughtError.message.includes('isolate'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles user cancellation via AbortSignal', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();

    globalThis.fetch = async (_input, init) => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    try {
      const promise = removeBackground(new Blob(['photo']), {
        baseUrl: 'http://127.0.0.1:8000',
        externalSignal: controller.signal,
      });

      // Trigger abort immediately
      controller.abort();

      let caughtError: BackgroundRemovalError | null = null;
      try {
        await promise;
      } catch (err: unknown) {
        caughtError = err as BackgroundRemovalError;
      }
      assertIsError(caughtError);
      assert.equal(caughtError.isCancelled, true);
      assert.ok(caughtError.message.includes('cancelled'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles request timeout gracefully', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (_input, init) => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('TIMEOUT');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    try {
      let caughtError: BackgroundRemovalError | null = null;
      try {
        // Set 50ms timeout for rapid test execution
        await removeBackground(new Blob(['photo']), {
          baseUrl: 'http://127.0.0.1:8000',
          timeoutMs: 50,
        });
      } catch (err: unknown) {
        caughtError = err as BackgroundRemovalError;
      }
      assertIsError(caughtError);
      assert.equal(caughtError.statusCode, 408);
      assert.ok(caughtError.message.includes('timed out'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
