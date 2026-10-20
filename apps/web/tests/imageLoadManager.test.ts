import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createImageLoadSession } from '../src/utils/imageLoadManager.ts';

describe('Image Load Session & Concurrency Manager', () => {
  it('increments session IDs sequentially', () => {
    const session = createImageLoadSession();
    assert.equal(session.getCurrentId(), 0);

    const id1 = session.nextSessionId();
    assert.equal(id1, 1);
    assert.equal(session.getCurrentId(), 1);

    const id2 = session.nextSessionId();
    assert.equal(id2, 2);
    assert.equal(session.getCurrentId(), 2);
  });

  it('identifies only the most recent session as active', () => {
    const session = createImageLoadSession();
    const tokenA = session.nextSessionId(); // 1
    assert.equal(session.isActive(tokenA), true);

    const tokenB = session.nextSessionId(); // 2
    // tokenA is now stale
    assert.equal(session.isActive(tokenA), false);
    // tokenB is active
    assert.equal(session.isActive(tokenB), true);
  });

  it('invalidates pending tokens when cancelled', () => {
    const session = createImageLoadSession();
    const token = session.nextSessionId();
    assert.equal(session.isActive(token), true);

    session.cancel();
    assert.equal(session.isActive(token), false);
  });

  it('prevents stale async completions from overwriting newer selections', () => {
    const session = createImageLoadSession();

    // User starts loading File 1 (large file, slow decode)
    const file1Token = session.nextSessionId();

    // User quickly selects File 2 (small file, fast decode)
    const file2Token = session.nextSessionId();

    // Simulation: File 2 finishes first
    let activeFileLoaded = '';
    if (session.isActive(file2Token)) {
      activeFileLoaded = 'File 2';
    }
    assert.equal(activeFileLoaded, 'File 2');

    // Simulation: File 1 finishes later
    if (session.isActive(file1Token)) {
      activeFileLoaded = 'File 1'; // Should NOT execute
    }
    // File 1 was properly ignored because file1Token is no longer active!
    assert.equal(activeFileLoaded, 'File 2');
  });
});
