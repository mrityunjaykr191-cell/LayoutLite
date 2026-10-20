import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { generatePrintReadyPdf } from '../src/services/pdfGenerator.ts';
import {
  type PhotoDimensions,
  type SheetLayoutSettings,
  A4_SHEET_DIMENSIONS_MM,
  DEFAULT_PAGE_MARGINS_MM,
  DEFAULT_LAYOUT_GAPS_MM,
  calculateSheetLayout,
  mmToPoints,
} from '@passport-photo/shared';

// Minimal valid 1x1 RGBA PNG byte array fixture for unit tests
const MINIMAL_VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length & type
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, // 8-bit depth, RGBA, CRC
  0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, // IDAT chunk length & type
  0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed payload
  0x0d, 0x0a, 0x2d, 0xb4, // CRC
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
  0xae, 0x42, 0x60, 0x82,
]);

const TEST_PHOTO_DIMENSIONS: PhotoDimensions = Object.freeze({
  widthMm: 35,
  heightMm: 45,
  unitPreference: 'mm',
});

describe('Print-Ready PDF Generator Service', () => {
  it('generates a valid A4 PDF document with exact physical dimensions', async () => {
    const settings: SheetLayoutSettings = {
      sheetDimensions: A4_SHEET_DIMENSIONS_MM,
      margins: DEFAULT_PAGE_MARGINS_MM,
      gaps: DEFAULT_LAYOUT_GAPS_MM,
      layoutMode: 'single-row',
      copyCount: 4,
    };
    const layoutResult = calculateSheetLayout(settings, TEST_PHOTO_DIMENSIONS);
    assert.equal(layoutResult.fits, true);

    const pdfBlob = await generatePrintReadyPdf(layoutResult, MINIMAL_VALID_PNG_BYTES, {
      includeCutGuides: true,
      includeCalibrationRuler: true,
    });

    assert.ok(pdfBlob);
    assert.equal(pdfBlob.type, 'application/pdf');
    assert.ok(pdfBlob.size > 1000); // Standard PDF header + stream

    // Load and inspect the generated PDF structure
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer);

    assert.equal(doc.getPageCount(), 1);

    const page = doc.getPages()[0]!;
    const expectedWidthPt = mmToPoints(210); // ~595.28 pt
    const expectedHeightPt = mmToPoints(297); // ~841.89 pt

    assert.equal(Math.round(page.getWidth() * 100) / 100, Math.round(expectedWidthPt * 100) / 100);
    assert.equal(Math.round(page.getHeight() * 100) / 100, Math.round(expectedHeightPt * 100) / 100);
    assert.equal(doc.getTitle(), 'Document Portrait Photos — A4 Sheet');
  });

  it('generates multi-row grid layout with calibration ruler and cutting guides', async () => {
    const settings: SheetLayoutSettings = {
      sheetDimensions: A4_SHEET_DIMENSIONS_MM,
      margins: DEFAULT_PAGE_MARGINS_MM,
      gaps: DEFAULT_LAYOUT_GAPS_MM,
      layoutMode: 'grid',
      copyCount: 8,
    };
    const layoutResult = calculateSheetLayout(settings, TEST_PHOTO_DIMENSIONS);
    assert.equal(layoutResult.fits, true);
    assert.equal(layoutResult.placedCount, 8);

    const pdfBlob = await generatePrintReadyPdf(layoutResult, MINIMAL_VALID_PNG_BYTES, {
      includeCutGuides: true,
      includeCalibrationRuler: true,
    });

    assert.ok(pdfBlob.size > 1000);
    const doc = await PDFDocument.load(await pdfBlob.arrayBuffer());
    assert.equal(doc.getPageCount(), 1);
  });

  it('respects optional cut guides and calibration ruler toggles', async () => {
    const settings: SheetLayoutSettings = {
      sheetDimensions: A4_SHEET_DIMENSIONS_MM,
      margins: DEFAULT_PAGE_MARGINS_MM,
      gaps: DEFAULT_LAYOUT_GAPS_MM,
      layoutMode: 'single-row',
      copyCount: 2,
    };
    const layoutResult = calculateSheetLayout(settings, TEST_PHOTO_DIMENSIONS);

    const pdfBlobWithoutGuides = await generatePrintReadyPdf(layoutResult, MINIMAL_VALID_PNG_BYTES, {
      includeCutGuides: false,
      includeCalibrationRuler: false,
    });

    assert.ok(pdfBlobWithoutGuides.size > 0);
    const doc = await PDFDocument.load(await pdfBlobWithoutGuides.arrayBuffer());
    assert.equal(doc.getPageCount(), 1);
  });

  it('defaults cut guides to layoutResult.includeCutGuides (off by default)', async () => {
    const settings: SheetLayoutSettings = {
      sheetDimensions: A4_SHEET_DIMENSIONS_MM,
      margins: DEFAULT_PAGE_MARGINS_MM,
      gaps: DEFAULT_LAYOUT_GAPS_MM,
      layoutMode: 'single-row',
      copyCount: 2,
    };
    const layoutResult = calculateSheetLayout(settings, TEST_PHOTO_DIMENSIONS);
    assert.equal(layoutResult.includeCutGuides, false);

    const pdfBlob = await generatePrintReadyPdf(layoutResult, MINIMAL_VALID_PNG_BYTES);
    assert.ok(pdfBlob.size > 0);
    const doc = await PDFDocument.load(await pdfBlob.arrayBuffer());
    assert.equal(doc.getPageCount(), 1);
  });
});
