import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImageFile,
  validateImageDimensions,
  formatFileSize,
  getImageOrientationLabel,
  MAX_FILE_SIZE_BYTES,
  MIN_RECOMMENDED_PIXELS,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_EXTENSIONS,
} from '../src/utils/fileValidation.ts';

describe('Web App File Validation Module', () => {
  describe('Constants & Configuration', () => {
    it('defines 25 MB maximum file size limit', () => {
      assert.equal(MAX_FILE_SIZE_BYTES, 25 * 1024 * 1024);
    });

    it('defines minimum 300px recommended dimension', () => {
      assert.equal(MIN_RECOMMENDED_PIXELS, 300);
    });

    it('supports standard portrait image formats', () => {
      assert.ok(SUPPORTED_MIME_TYPES.includes('image/jpeg'));
      assert.ok(SUPPORTED_MIME_TYPES.includes('image/png'));
      assert.ok(SUPPORTED_MIME_TYPES.includes('image/webp'));
      assert.ok(SUPPORTED_EXTENSIONS.includes('.jpg'));
      assert.ok(SUPPORTED_EXTENSIONS.includes('.png'));
    });
  });

  describe('validateImageFile', () => {
    it('accepts valid JPEG photo', () => {
      const result = validateImageFile({
        name: 'portrait.jpg',
        size: 3 * 1024 * 1024, // 3 MB
        type: 'image/jpeg',
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('accepts valid PNG photo', () => {
      const result = validateImageFile({
        name: 'headshot.png',
        size: 5 * 1024 * 1024, // 5 MB
        type: 'image/png',
      });
      assert.equal(result.valid, true);
    });

    it('accepts valid WebP photo', () => {
      const result = validateImageFile({
        name: 'photo.webp',
        size: 1.5 * 1024 * 1024,
        type: 'image/webp',
      });
      assert.equal(result.valid, true);
    });

    it('rejects null or undefined input', () => {
      assert.equal(validateImageFile(null).valid, false);
      assert.equal(validateImageFile(undefined).valid, false);
    });

    it('rejects empty (0 byte) file', () => {
      const result = validateImageFile({
        name: 'empty.jpg',
        size: 0,
        type: 'image/jpeg',
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('empty')));
    });

    it('rejects oversized files exceeding 25 MB', () => {
      const result = validateImageFile({
        name: 'huge.jpg',
        size: 26 * 1024 * 1024, // 26 MB
        type: 'image/jpeg',
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('too large')));
      assert.ok(result.errors.some((e) => e.includes('25.0 MB')));
    });

    it('accepts file exactly at 25 MB limit', () => {
      const result = validateImageFile({
        name: 'exact-limit.jpg',
        size: 25 * 1024 * 1024,
        type: 'image/jpeg',
      });
      assert.equal(result.valid, true);
    });

    it('rejects unsupported file formats (PDF, GIF, HEIC, EXE)', () => {
      const rPdf = validateImageFile({
        name: 'document.pdf',
        size: 1024 * 1024,
        type: 'application/pdf',
      });
      assert.equal(rPdf.valid, false);
      assert.ok(rPdf.errors.some((e) => e.includes('Unsupported format')));

      const rGif = validateImageFile({
        name: 'animation.gif',
        size: 1024 * 1024,
        type: 'image/gif',
      });
      assert.equal(rGif.valid, false);

      const rExe = validateImageFile({
        name: 'program.exe',
        size: 1024 * 1024,
        type: 'application/octet-stream',
      });
      assert.equal(rExe.valid, false);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes, kilobytes, and megabytes cleanly', () => {
      assert.equal(formatFileSize(0), '0 B');
      assert.equal(formatFileSize(512), '512 B');
      assert.equal(formatFileSize(1024), '1.0 KB');
      assert.equal(formatFileSize(2048), '2.0 KB');
      assert.equal(formatFileSize(1024 * 1024), '1.0 MB');
      assert.equal(formatFileSize(2.5 * 1024 * 1024), '2.5 MB');
      assert.equal(formatFileSize(25 * 1024 * 1024), '25.0 MB');
    });

    it('handles negative or invalid values gracefully', () => {
      assert.equal(formatFileSize(-100), '0 B');
      assert.equal(formatFileSize(NaN), '0 B');
    });
  });

  describe('validateImageDimensions', () => {
    it('validates high-resolution photo dimensions', () => {
      const result = validateImageDimensions(1200, 1600);
      assert.equal(result.valid, true);
      assert.equal(result.isLowResolution, false);
    });

    it('identifies low-resolution photos below 300px', () => {
      const result = validateImageDimensions(200, 250);
      assert.equal(result.valid, true);
      assert.equal(result.isLowResolution, true);
      assert.ok(result.message && result.message.includes('Resolution is low'));
    });

    it('rejects invalid or non-positive dimensions', () => {
      assert.equal(validateImageDimensions(0, 100).valid, false);
      assert.equal(validateImageDimensions(-100, 200).valid, false);
      assert.equal(validateImageDimensions(NaN, 500).valid, false);
    });
  });

  describe('getImageOrientationLabel', () => {
    it('identifies portrait orientation correctly', () => {
      assert.equal(getImageOrientationLabel(600, 800), 'Portrait');
    });

    it('identifies landscape orientation correctly', () => {
      assert.equal(getImageOrientationLabel(800, 600), 'Landscape');
    });

    it('identifies square orientation correctly', () => {
      assert.equal(getImageOrientationLabel(500, 500), 'Square');
    });
  });
});
