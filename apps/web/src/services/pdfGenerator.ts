import {
  type SheetLayoutResult,
  mmToPoints,
} from '@passport-photo/shared';

export interface PdfGenerationOptions {
  readonly filename?: string;
  readonly includeCutGuides?: boolean;
  readonly includeCalibrationRuler?: boolean;
}

/**
 * Checks if the buffer starts with the standard 8-byte PNG file signature.
 */
function isPngSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

/**
 * Generates an uncompressed, physical-scale 300 DPI A4 PDF containing
 * the placed photos, vector corner cut-guides, and 50 mm calibration ruler.
 *
 * All coordinates are converted from millimeter layout coordinates into PDF points (1/72 inch).
 * PDF origin (0, 0) is at the bottom-left of the page.
 */
export async function generatePrintReadyPdf(
  layoutResult: SheetLayoutResult,
  photoImageBytes: Uint8Array | ArrayBuffer,
  options: PdfGenerationOptions = {}
): Promise<Blob> {
  const {
    includeCutGuides = layoutResult.includeCutGuides ?? false,
    includeCalibrationRuler = true,
  } = options;

  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();

  // Page dimensions in exact PDF points (A4: 210 x 297 mm = 595.28 x 841.89 pt)
  const pageWidthPt = mmToPoints(layoutResult.sheetDimensions.widthMm);
  const pageHeightPt = mmToPoints(layoutResult.sheetDimensions.heightMm);

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // Embed the photo image bytes (auto-detect PNG vs JPEG)
  const rawBytes = photoImageBytes instanceof Uint8Array
    ? photoImageBytes
    : new Uint8Array(photoImageBytes);

  const embeddedImage = isPngSignature(rawBytes)
    ? await pdfDoc.embedPng(rawBytes)
    : await pdfDoc.embedJpg(rawBytes);

  const guideColor = rgb(0.2, 0.25, 0.3); // Subtle dark slate (#334155)

  // 1. Draw each placed photo and its corner cut guides
  for (const photo of layoutResult.photos) {
    // Transform from top-left origin to PDF bottom-left origin:
    // x_pdf = photo.xPt
    // y_pdf = pageHeightPt - (photo.yPt + photo.heightPt)
    const xPdf = photo.xPt;
    const yPdf = pageHeightPt - (photo.yPt + photo.heightPt);
    const wPt = photo.widthPt;
    const hPt = photo.heightPt;

    // Draw the image at 1:1 physical scale
    page.drawImage(embeddedImage, {
      x: xPdf,
      y: yPdf,
      width: wPt,
      height: hPt,
    });

    // Optional vector corner cut guides (outer tick marks)
    if (includeCutGuides && photo.cutGuides) {
      const segments = [
        photo.cutGuides.topLeft.horizontal,
        photo.cutGuides.topLeft.vertical,
        photo.cutGuides.topRight.horizontal,
        photo.cutGuides.topRight.vertical,
        photo.cutGuides.bottomLeft.horizontal,
        photo.cutGuides.bottomLeft.vertical,
        photo.cutGuides.bottomRight.horizontal,
        photo.cutGuides.bottomRight.vertical,
      ];

      for (const seg of segments) {
        // Skip zero-length segments if cut guides were disabled in layout
        if (seg.x1Pt === seg.x2Pt && seg.y1Pt === seg.y2Pt) continue;

        page.drawLine({
          start: {
            x: seg.x1Pt,
            y: pageHeightPt - seg.y1Pt,
          },
          end: {
            x: seg.x2Pt,
            y: pageHeightPt - seg.y2Pt,
          },
          thickness: 0.5,
          color: guideColor,
        });
      }
    }
  }

  // 2. Embed 50 mm Physical Calibration Ruler in Bottom Margin
  if (includeCalibrationRuler) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const rulerLengthMm = 50;
    const rulerLengthPt = mmToPoints(rulerLengthMm); // ~141.732 pt
    const rulerBottomMarginMm = 10;
    const rulerYPt = mmToPoints(rulerBottomMarginMm); // ~28.35 pt from bottom
    const rulerXStartPt = (pageWidthPt - rulerLengthPt) / 2;
    const rulerXEndPt = rulerXStartPt + rulerLengthPt;

    // Horizontal baseline
    page.drawLine({
      start: { x: rulerXStartPt, y: rulerYPt },
      end: { x: rulerXEndPt, y: rulerYPt },
      thickness: 0.5,
      color: guideColor,
    });

    // Major 10 mm ticks (4 pt height)
    for (let mm = 0; mm <= rulerLengthMm; mm += 10) {
      const xTick = rulerXStartPt + mmToPoints(mm);
      page.drawLine({
        start: { x: xTick, y: rulerYPt },
        end: { x: xTick, y: rulerYPt + 4 },
        thickness: 0.5,
        color: guideColor,
      });
    }

    // Minor 5 mm ticks (2.5 pt height)
    for (let mm = 5; mm < rulerLengthMm; mm += 10) {
      const xTick = rulerXStartPt + mmToPoints(mm);
      page.drawLine({
        start: { x: xTick, y: rulerYPt },
        end: { x: xTick, y: rulerYPt + 2.5 },
        thickness: 0.35,
        color: guideColor,
      });
    }

    // Ruler explanatory text (centered above ruler)
    const captionText = '50 mm Calibration Ruler: Measure with a physical ruler to verify 100% scale';
    const captionSize = 6.5;
    const captionWidth = font.widthOfTextAtSize(captionText, captionSize);
    const captionX = rulerXStartPt + (rulerLengthPt - captionWidth) / 2;
    const captionY = rulerYPt + 6;

    page.drawText(captionText, {
      x: captionX,
      y: captionY,
      size: captionSize,
      font,
      color: guideColor,
    });
  }

  // Set standard PDF metadata
  pdfDoc.setTitle('Document Portrait Photos — A4 Sheet');
  pdfDoc.setSubject('Prepared with LayoutLite at exact 1:1 physical print scale');
  pdfDoc.setProducer('LayoutLite (pdf-lib)');
  pdfDoc.setCreationDate(new Date());

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Triggers a browser file download of the given Blob.
 */
export function triggerFileDownload(blob: Blob, filename = 'document-photos-a4.pdf'): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
