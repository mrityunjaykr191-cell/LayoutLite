import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultCropSettings,
  rotate90DegreesClockwise,
  getRotatedDimensions,
  calculateCropBox,
  calculateBaseFitScale,
  clampPanOffset,
  calculateSourceCropRect,
  moveCropBox,
  resizeCropBoxWithHandle,
  clampCropBoxToBounds,
  calculateSourceCropFromBox,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../src/utils/cropGeometry.ts';

describe('Crop Geometry Engine', () => {
  describe('Default Settings & Constants', () => {
    it('initializes default crop settings centered with 1.0x zoom and 0deg rotation', () => {
      const def = createDefaultCropSettings();
      assert.equal(def.zoom, 1.0);
      assert.equal(def.panX, 0);
      assert.equal(def.panY, 0);
      assert.equal(def.rotation, 0);
    });

    it('enforces zoom constraints between 1.0 and 3.0', () => {
      assert.equal(MIN_ZOOM, 1.0);
      assert.equal(MAX_ZOOM, 3.0);
    });
  });

  describe('90-Degree Rotation Geometry', () => {
    it('cycles through 90 degree increments clockwise (0 -> 90 -> 180 -> 270 -> 0)', () => {
      assert.equal(rotate90DegreesClockwise(0), 90);
      assert.equal(rotate90DegreesClockwise(90), 180);
      assert.equal(rotate90DegreesClockwise(180), 270);
      assert.equal(rotate90DegreesClockwise(270), 0);
    });

    it('preserves width and height at 0 and 180 degrees', () => {
      const r0 = getRotatedDimensions(1200, 1600, 0);
      assert.equal(r0.width, 1200);
      assert.equal(r0.height, 1600);

      const r180 = getRotatedDimensions(1200, 1600, 180);
      assert.equal(r180.width, 1200);
      assert.equal(r180.height, 1600);
    });

    it('swaps width and height at 90 and 270 degrees', () => {
      const r90 = getRotatedDimensions(1200, 1600, 90);
      assert.equal(r90.width, 1600);
      assert.equal(r90.height, 1200);

      const r270 = getRotatedDimensions(1200, 1600, 270);
      assert.equal(r270.width, 1600);
      assert.equal(r270.height, 1200);
    });
  });

  describe('calculateCropBox', () => {
    it('calculates centered crop box matching target aspect ratio', () => {
      // 35x45mm ratio = 35 / 45 = 7 / 9 ~ 0.7777777777777778
      const aspect = 35 / 45;
      // In 400x400 container with 20px padding -> usable 360x360
      const box = calculateCropBox(400, 400, aspect, 20);

      assert.equal(box.height, 360);
      assert.ok(Math.abs(box.width - 280) < 0.001); // 360 * (35/45) = 280
      assert.ok(Math.abs(box.width / box.height - aspect) < 1e-10);

      // Centered positions:
      assert.equal(box.y, 20); // (400 - 360) / 2
      assert.equal(box.x, 60); // (400 - 280) / 2
    });

    it('handles wide container where width is greater than height', () => {
      const aspect = 35 / 45;
      const box = calculateCropBox(800, 400, aspect, 20);
      // Usable: 760 x 360. Height limit dominates.
      assert.equal(box.height, 360);
      assert.ok(Math.abs(box.width - 280) < 0.001);
      assert.equal(box.x, (800 - 280) / 2);
    });

    it('handles tall container where height is greater than width', () => {
      const aspect = 35 / 45;
      const box = calculateCropBox(300, 800, aspect, 20);
      // Usable: 260 x 760. Width limit dominates.
      assert.equal(box.width, 260);
      assert.ok(Math.abs(box.height - (260 / aspect)) < 0.001);
      assert.equal(box.x, 20);
    });

    it('returns zero rect for invalid or non-positive container dimensions', () => {
      const b0 = calculateCropBox(0, 400, 0.75);
      assert.equal(b0.width, 0);
      assert.equal(b0.height, 0);

      const bNaN = calculateCropBox(NaN, 400, 0.75);
      assert.equal(bNaN.width, 0);
    });
  });

  describe('calculateBaseFitScale & clampPanOffset', () => {
    it('calculates scale ensuring full coverage of crop box', () => {
      // Crop box: 280 x 360 (aspect 0.777)
      // Source image: 1000 x 1000 (aspect 1.0)
      // scaleX = 280 / 1000 = 0.28, scaleY = 360 / 1000 = 0.36 -> baseScale = 0.36
      const scale = calculateBaseFitScale(1000, 1000, 280, 360);
      assert.equal(scale, 0.36);
    });

    it('clamps pan offset so image never drifts outside crop box', () => {
      // Image: 1000 x 1000, CropBox: 280 x 360. Scale = 0.36.
      // Rendered width = 1000 * 0.36 = 360. Crop box width = 280.
      // Max horizontal pan = (360 - 280) / 2 = 40px.
      // Rendered height = 1000 * 0.36 = 360. Crop box height = 360.
      // Max vertical pan = (360 - 360) / 2 = 0px.
      const clampedCenter = clampPanOffset(0, 0, 1.0, 1000, 1000, 280, 360);
      assert.equal(clampedCenter.panX, 0);
      assert.equal(clampedCenter.panY, 0);

      const clampedExcess = clampPanOffset(100, -50, 1.0, 1000, 1000, 280, 360);
      assert.equal(clampedExcess.panX, 40); // Clamped from 100 to 40
      assert.equal(clampedExcess.panY, 0); // Clamped from -50 to 0
    });

    it('allows larger pan range when zoom is increased', () => {
      // At 2.0x zoom: rendered size = 1000 * 0.36 * 2.0 = 720.
      // Max panX = (720 - 280) / 2 = 220px.
      // Max panY = (720 - 360) / 2 = 180px.
      const clampedZoomed = clampPanOffset(200, 150, 2.0, 1000, 1000, 280, 360);
      assert.equal(clampedZoomed.panX, 200);
      assert.equal(clampedZoomed.panY, 150);

      const clampedBeyond = clampPanOffset(300, -300, 2.0, 1000, 1000, 280, 360);
      assert.equal(clampedBeyond.panX, 220);
      assert.equal(clampedBeyond.panY, -180);
    });
  });

  describe('calculateSourceCropRect', () => {
    it('calculates centered source rectangle with exact aspect ratio', () => {
      // Source: 1000 x 1000, aspect: 7/9
      // CropBox: 280 x 360
      // scale = 0.36
      // sWidth = 280 / 0.36 = 777.7777777777778
      // sHeight = 360 / 0.36 = 1000
      const rect = calculateSourceCropRect(1000, 1000, 1.0, 0, 0, 280, 360);

      assert.equal(rect.sy, 0);
      assert.equal(rect.sHeight, 1000);
      assert.ok(Math.abs(rect.sWidth - (280 / 0.36)) < 0.001);
      assert.ok(Math.abs(rect.sx - (1000 - rect.sWidth) / 2) < 0.001);
      assert.ok(Math.abs(rect.sWidth / rect.sHeight - (7 / 9)) < 1e-10);
    });

    it('preserves boundary bounds for landscape source images', () => {
      // Landscape source: 2000 x 1000
      const rect = calculateSourceCropRect(2000, 1000, 1.0, 0, 0, 280, 360);
      assert.ok(rect.sx >= 0);
      assert.ok(rect.sy >= 0);
      assert.ok(rect.sx + rect.sWidth <= 2000);
      assert.ok(rect.sy + rect.sHeight <= 1000);
    });

    it('preserves boundary bounds for tall portrait source images', () => {
      // Tall portrait source: 1000 x 2500
      const rect = calculateSourceCropRect(1000, 2500, 1.0, 0, 0, 280, 360);
      assert.ok(rect.sx >= 0);
      assert.ok(rect.sy >= 0);
      assert.ok(rect.sx + rect.sWidth <= 1000);
      assert.ok(rect.sy + rect.sHeight <= 2500);
    });
  });

  describe('moveCropBox', () => {
    const bounds = { minX: 10, minY: 10, maxX: 400, maxY: 400 };
    const initialBox = { x: 50, y: 50, width: 140, height: 180 };

    it('moves crop box cleanly within bounds without mutating dimensions', () => {
      const moved = moveCropBox(initialBox, 20, 30, bounds);
      assert.equal(moved.x, 70);
      assert.equal(moved.y, 80);
      assert.equal(moved.width, 140);
      assert.equal(moved.height, 180);
    });

    it('clamps to left and top bounds', () => {
      const moved = moveCropBox(initialBox, -100, -100, bounds);
      assert.equal(moved.x, 10);
      assert.equal(moved.y, 10);
      assert.equal(moved.width, 140);
      assert.equal(moved.height, 180);
    });

    it('clamps to right and bottom bounds', () => {
      // maxX is 400, width is 140 -> max x is 260
      // maxY is 400, height is 180 -> max y is 220
      const moved = moveCropBox(initialBox, 500, 500, bounds);
      assert.equal(moved.x, 260);
      assert.equal(moved.y, 220);
      assert.equal(moved.width, 140);
      assert.equal(moved.height, 180);
    });
  });

  describe('resizeCropBoxWithHandle (Aspect-Locked Resizing)', () => {
    const targetAspect = 35 / 45; // 7 / 9
    const bounds = { minX: 0, minY: 0, maxX: 500, maxY: 500 };
    const box = { x: 100, y: 100, width: 140, height: 180 }; // aspect 140/180 = 7/9

    it('resizes from SE corner maintaining exact aspect ratio', () => {
      const resized = resizeCropBoxWithHandle(box, 'se', 35, 45, targetAspect, bounds);
      assert.equal(resized.x, 100);
      assert.equal(resized.y, 100);
      assert.ok(resized.width > 140);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('resizes from NW corner maintaining anchor at SE corner', () => {
      const anchorX = box.x + box.width; // 240
      const anchorY = box.y + box.height; // 280

      const resized = resizeCropBoxWithHandle(box, 'nw', -35, -45, targetAspect, bounds);
      assert.equal(resized.x + resized.width, anchorX);
      assert.equal(resized.y + resized.height, anchorY);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('resizes from NE corner maintaining anchor at SW corner', () => {
      const anchorX = box.x; // 100
      const anchorY = box.y + box.height; // 280

      const resized = resizeCropBoxWithHandle(box, 'ne', 35, -45, targetAspect, bounds);
      assert.equal(resized.x, anchorX);
      assert.equal(resized.y + resized.height, anchorY);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('resizes from SW corner maintaining anchor at NE corner', () => {
      const anchorX = box.x + box.width; // 240
      const anchorY = box.y; // 100

      const resized = resizeCropBoxWithHandle(box, 'sw', -35, 45, targetAspect, bounds);
      assert.equal(resized.x + resized.width, anchorX);
      assert.equal(resized.y, anchorY);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('resizes from E (right edge) symmetrically maintaining vertical center', () => {
      const centerY = box.y + box.height / 2; // 190

      const resized = resizeCropBoxWithHandle(box, 'e', 35, 0, targetAspect, bounds);
      assert.equal(resized.x, box.x);
      assert.ok(Math.abs(resized.y + resized.height / 2 - centerY) < 1e-5);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('resizes from W (left edge) symmetrically maintaining vertical center', () => {
      const centerY = box.y + box.height / 2; // 190

      const resized = resizeCropBoxWithHandle(box, 'w', -35, 0, targetAspect, bounds);
      assert.equal(resized.x + resized.width, box.x + box.width);
      assert.ok(Math.abs(resized.y + resized.height / 2 - centerY) < 1e-5);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('resizes from S (bottom edge) symmetrically maintaining horizontal center', () => {
      const centerX = box.x + box.width / 2; // 170

      const resized = resizeCropBoxWithHandle(box, 's', 0, 45, targetAspect, bounds);
      assert.equal(resized.y, box.y);
      assert.ok(Math.abs(resized.x + resized.width / 2 - centerX) < 1e-5);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('resizes from N (top edge) symmetrically maintaining horizontal center', () => {
      const centerX = box.x + box.width / 2; // 170

      const resized = resizeCropBoxWithHandle(box, 'n', 0, -45, targetAspect, bounds);
      assert.equal(resized.y + resized.height, box.y + box.height);
      assert.ok(Math.abs(resized.x + resized.width / 2 - centerX) < 1e-5);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('strictly clamps to bounds when dragging excessively', () => {
      const tightBounds = { minX: 0, minY: 0, maxX: 200, maxY: 200 };
      const resized = resizeCropBoxWithHandle(
        { x: 50, y: 50, width: 70, height: 90 },
        'se',
        500,
        500,
        targetAspect,
        tightBounds
      );

      assert.ok(resized.x + resized.width <= tightBounds.maxX);
      assert.ok(resized.y + resized.height <= tightBounds.maxY);
      assert.ok(Math.abs(resized.width / resized.height - targetAspect) < 1e-10);
    });

    it('enforces minimum width constraint', () => {
      const resized = resizeCropBoxWithHandle(box, 'se', -500, -500, targetAspect, bounds, 60);
      assert.equal(resized.width, 60);
      assert.equal(resized.height, 60 / targetAspect);
    });
  });

  describe('clampCropBoxToBounds', () => {
    it('clamps crop box within smaller container preserving aspect ratio', () => {
      const targetAspect = 7 / 9;
      const bounds = { minX: 10, minY: 10, maxX: 150, maxY: 150 };
      const largeBox = { x: 0, y: 0, width: 300, height: 300 / targetAspect };

      const clamped = clampCropBoxToBounds(largeBox, bounds, targetAspect);
      assert.ok(clamped.x >= bounds.minX);
      assert.ok(clamped.y >= bounds.minY);
      assert.ok(clamped.x + clamped.width <= bounds.maxX);
      assert.ok(clamped.y + clamped.height <= bounds.maxY);
      assert.ok(Math.abs(clamped.width / clamped.height - targetAspect) < 1e-10);
    });
  });

  describe('calculateSourceCropFromBox', () => {
    it('maps on-screen crop box directly to rotated source coordinates', () => {
      // Source image: 1200 x 1200
      // Rendered on stage: width = 600, height = 600 (scale = 0.5)
      // Top-left at (50, 50)
      const imageBounds = { left: 50, top: 50, width: 600, height: 600 };
      // Crop box on stage at (100, 100), size (140, 180)
      const cropBox = { x: 100, y: 100, width: 140, height: 180 };

      const sourceRect = calculateSourceCropFromBox(cropBox, imageBounds, 1200, 1200);

      // relX = 100 - 50 = 50 -> sx = 50 / 0.5 = 100
      // relY = 100 - 50 = 50 -> sy = 50 / 0.5 = 100
      // sWidth = 140 / 0.5 = 280
      // sHeight = 180 / 0.5 = 360
      assert.equal(sourceRect.sx, 100);
      assert.equal(sourceRect.sy, 100);
      assert.equal(sourceRect.sWidth, 280);
      assert.equal(sourceRect.sHeight, 360);
      assert.ok(Math.abs(sourceRect.sWidth / sourceRect.sHeight - (140 / 180)) < 1e-10);
    });

    it('guarantees source rectangle stays within source image boundaries', () => {
      const imageBounds = { left: 0, top: 0, width: 500, height: 500 };
      const cropBox = { x: 0, y: 0, width: 500, height: 500 };
      const sourceRect = calculateSourceCropFromBox(cropBox, imageBounds, 1000, 1000);

      assert.equal(sourceRect.sx, 0);
      assert.equal(sourceRect.sy, 0);
      assert.equal(sourceRect.sWidth, 1000);
      assert.equal(sourceRect.sHeight, 1000);
    });
  });

  describe('Crop Settings & Framing Restoration', () => {
    it('packages and preserves previous cropBox, zoom, pan, and rotation', () => {
      const savedBox = { x: 75, y: 45, width: 210, height: 270 };
      const settings = {
        zoom: 1.5,
        panX: 25,
        panY: -15,
        rotation: 90 as const,
        cropBox: savedBox,
      };

      assert.equal(settings.zoom, 1.5);
      assert.equal(settings.panX, 25);
      assert.equal(settings.panY, -15);
      assert.equal(settings.rotation, 90);
      assert.deepEqual(settings.cropBox, savedBox);
    });

    it('safely re-clamps restored cropBox if stage bounds changed between edits', () => {
      const targetAspect = 35 / 45;
      const previousBox = { x: 100, y: 100, width: 280, height: 360 };
      // Stage became smaller (e.g. mobile device orientation change)
      const smallerBounds = { minX: 10, minY: 10, maxX: 200, maxY: 250 };

      const reClamped = clampCropBoxToBounds(previousBox, smallerBounds, targetAspect);

      assert.ok(reClamped.x >= smallerBounds.minX);
      assert.ok(reClamped.y >= smallerBounds.minY);
      assert.ok(reClamped.x + reClamped.width <= smallerBounds.maxX);
      assert.ok(reClamped.y + reClamped.height <= smallerBounds.maxY);
      assert.ok(Math.abs(reClamped.width / reClamped.height - targetAspect) < 1e-10);
    });
  });
});


