import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPhotoUrlTracker } from '../src/utils/photoUrlTracker.ts';

describe('Photo URL Lifecycle & Cleanup Tracker', () => {
  it('registers raw master photo URL without revoking it', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    tracker.setRawPhotoUrl('blob:http://localhost:5173/master-photo-1');
    assert.equal(tracker.getRawUrl(), 'blob:http://localhost:5173/master-photo-1');
    assert.equal(tracker.getCroppedUrl(), null);
    assert.deepEqual(revokedUrls, []);
  });

  it('keeps raw master photo URL valid when applying a crop', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    tracker.setRawPhotoUrl('blob:http://localhost:5173/master-photo-1');
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/cropped-result-1');

    assert.equal(tracker.getRawUrl(), 'blob:http://localhost:5173/master-photo-1');
    assert.equal(tracker.getCroppedUrl(), 'blob:http://localhost:5173/cropped-result-1');
    // Crucial invariant: raw master URL is NEVER revoked when applying a crop!
    assert.deepEqual(revokedUrls, []);
  });

  it('preserves master URL and revokes superseded crop URL across repeated Adjust Crop -> Apply Crop cycles', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    // Initial upload
    tracker.setRawPhotoUrl('blob:http://localhost:5173/master-photo-1');

    // Cycle 1: Apply Crop
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-v1');
    assert.equal(tracker.getRawUrl(), 'blob:http://localhost:5173/master-photo-1');
    assert.equal(tracker.getCroppedUrl(), 'blob:http://localhost:5173/crop-v1');
    assert.deepEqual(revokedUrls, []);

    // Adjust Crop: User opens editor again (no URL changes occur)
    assert.equal(tracker.getRawUrl(), 'blob:http://localhost:5173/master-photo-1');

    // Cycle 2: User applies a new crop framing
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-v2');
    assert.equal(tracker.getRawUrl(), 'blob:http://localhost:5173/master-photo-1');
    assert.equal(tracker.getCroppedUrl(), 'blob:http://localhost:5173/crop-v2');
    // Only crop-v1 was superseded and revoked; master-photo-1 remains completely intact!
    assert.deepEqual(revokedUrls, ['blob:http://localhost:5173/crop-v1']);

    // Cycle 3: User adjusts and applies crop once more
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-v3');
    assert.equal(tracker.getRawUrl(), 'blob:http://localhost:5173/master-photo-1');
    assert.equal(tracker.getCroppedUrl(), 'blob:http://localhost:5173/crop-v3');
    assert.deepEqual(revokedUrls, [
      'blob:http://localhost:5173/crop-v1',
      'blob:http://localhost:5173/crop-v2',
    ]);
  });

  it('revokes previous master and crop URLs when user replaces the uploaded photo', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    tracker.setRawPhotoUrl('blob:http://localhost:5173/photo-A');
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-A');

    // User selects a different file
    tracker.setRawPhotoUrl('blob:http://localhost:5173/photo-B');

    assert.equal(tracker.getRawUrl(), 'blob:http://localhost:5173/photo-B');
    assert.equal(tracker.getCroppedUrl(), null);
    // Both old photo-A and old crop-A must be cleanly revoked
    assert.deepEqual(revokedUrls, [
      'blob:http://localhost:5173/photo-A',
      'blob:http://localhost:5173/crop-A',
    ]);
  });

  it('revokes active URLs on reset (Change Photo action)', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    tracker.setRawPhotoUrl('blob:http://localhost:5173/master-photo-1');
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-1');

    tracker.reset();
    assert.equal(tracker.getRawUrl(), null);
    assert.equal(tracker.getCroppedUrl(), null);
    assert.deepEqual(revokedUrls, [
      'blob:http://localhost:5173/master-photo-1',
      'blob:http://localhost:5173/crop-1',
    ]);
  });

  it('revokes active URLs on unmount cleanup', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    tracker.setRawPhotoUrl('blob:http://localhost:5173/master-photo-1');
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-1');

    tracker.cleanup();
    assert.equal(tracker.getRawUrl(), null);
    assert.equal(tracker.getCroppedUrl(), null);
    assert.deepEqual(revokedUrls, [
      'blob:http://localhost:5173/master-photo-1',
      'blob:http://localhost:5173/crop-1',
    ]);
  });

  it('handles redundant or duplicate URL sets safely without duplicate revokes', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    tracker.setRawPhotoUrl('blob:http://localhost:5173/photo-1');
    tracker.setRawPhotoUrl('blob:http://localhost:5173/photo-1'); // Same URL
    assert.deepEqual(revokedUrls, []);

    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-1');
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-1'); // Same URL
    assert.deepEqual(revokedUrls, []);
  });

  it('manages cutout and composited URL lifecycles accurately', () => {
    const revokedUrls: string[] = [];
    const tracker = createPhotoUrlTracker((url) => revokedUrls.push(url));

    tracker.setRawPhotoUrl('blob:http://localhost:5173/raw');
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop');

    // 1. Cutout generated
    tracker.setCutoutUrl('blob:http://localhost:5173/cutout-1');
    assert.equal(tracker.getCutoutUrl(), 'blob:http://localhost:5173/cutout-1');
    assert.deepEqual(revokedUrls, []); // Nothing revoked yet

    // 2. Color composited
    tracker.setCompositedUrl('blob:http://localhost:5173/composite-white');
    assert.equal(tracker.getCompositedUrl(), 'blob:http://localhost:5173/composite-white');
    assert.deepEqual(revokedUrls, []);

    // 3. User selects different background color (Blue)
    tracker.setCompositedUrl('blob:http://localhost:5173/composite-blue');
    assert.equal(tracker.getCompositedUrl(), 'blob:http://localhost:5173/composite-blue');
    assert.deepEqual(revokedUrls, ['blob:http://localhost:5173/composite-white']);

    // 4. User re-runs background removal (new cutout)
    tracker.setCutoutUrl('blob:http://localhost:5173/cutout-2');
    assert.equal(tracker.getCutoutUrl(), 'blob:http://localhost:5173/cutout-2');
    assert.equal(tracker.getCompositedUrl(), null); // composite superseded
    assert.deepEqual(revokedUrls, [
      'blob:http://localhost:5173/composite-white',
      'blob:http://localhost:5173/cutout-1',
      'blob:http://localhost:5173/composite-blue',
    ]);

    // 5. User adjusts crop framing (new crop)
    tracker.setCroppedPhotoUrl('blob:http://localhost:5173/crop-2');
    assert.equal(tracker.getCroppedUrl(), 'blob:http://localhost:5173/crop-2');
    assert.equal(tracker.getCutoutUrl(), null); // cutout superseded by crop change
    assert.deepEqual(revokedUrls, [
      'blob:http://localhost:5173/composite-white',
      'blob:http://localhost:5173/cutout-1',
      'blob:http://localhost:5173/composite-blue',
      'blob:http://localhost:5173/crop',
      'blob:http://localhost:5173/cutout-2',
    ]);

    // 6. Reset revokes remaining active URLs (raw and crop-2)
    tracker.reset();
    assert.deepEqual(revokedUrls, [
      'blob:http://localhost:5173/composite-white',
      'blob:http://localhost:5173/cutout-1',
      'blob:http://localhost:5173/composite-blue',
      'blob:http://localhost:5173/crop',
      'blob:http://localhost:5173/cutout-2',
      'blob:http://localhost:5173/raw',
      'blob:http://localhost:5173/crop-2',
    ]);
  });
});

