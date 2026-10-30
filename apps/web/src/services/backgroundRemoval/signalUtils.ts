/**
 * Utility for combining an external AbortSignal with an internal timeout.
 */

export function createCombinedSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal
): {
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
