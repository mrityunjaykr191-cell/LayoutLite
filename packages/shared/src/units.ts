/**
 * Physical and digital unit conversion utilities for Passport Photo Studio.
 *
 * Fundamental mathematical constants:
 * - 1 inch = 25.4 mm (exact international definition)
 * - 1 point = 1/72 inch (PostScript / PDF standard point)
 * - 1 inch = DPI pixels (at an explicitly supplied DPI)
 *
 * NOTE ON ROUNDING:
 * These functions preserve full floating-point precision without artificial intermediate rounding.
 * Callers requiring specific display or printer-raster rounding should round the final output.
 */

export const MM_PER_INCH = 25.4;
export const POINTS_PER_INCH = 72;
export const MM_PER_POINT = MM_PER_INCH / POINTS_PER_INCH; // ~0.35277777777777775
export const POINTS_PER_MM = POINTS_PER_INCH / MM_PER_INCH; // ~2.8346456692913384

/**
 * Validates that an input value is a finite number.
 * Throws TypeError or RangeError if the value is invalid.
 */
function assertFinite(value: number, paramName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Parameter '${paramName}' must be a finite number. Received: ${value}`);
  }
}

/**
 * Validates that a DPI value is a positive finite number greater than zero.
 */
function assertValidDpi(dpi: number): void {
  assertFinite(dpi, 'dpi');
  if (dpi <= 0) {
    throw new RangeError(`DPI must be greater than zero. Received: ${dpi}`);
  }
}

// ==========================================
// Physical Unit Conversions (mm <-> in <-> pt)
// ==========================================

/**
 * Converts millimeters to inches.
 * Formula: mm / 25.4
 */
export function mmToInches(mm: number): number {
  assertFinite(mm, 'mm');
  return mm / MM_PER_INCH;
}

/**
 * Converts inches to millimeters.
 * Formula: inches * 25.4
 */
export function inchesToMm(inches: number): number {
  assertFinite(inches, 'inches');
  return inches * MM_PER_INCH;
}

/**
 * Converts millimeters to PDF/PostScript points.
 * Formula: mm * (72 / 25.4)
 */
export function mmToPoints(mm: number): number {
  assertFinite(mm, 'mm');
  return mm * POINTS_PER_MM;
}

/**
 * Converts PDF/PostScript points to millimeters.
 * Formula: points * (25.4 / 72)
 */
export function pointsToMm(points: number): number {
  assertFinite(points, 'points');
  return points * MM_PER_POINT;
}

/**
 * Converts inches to PDF/PostScript points.
 * Formula: inches * 72
 */
export function inchesToPoints(inches: number): number {
  assertFinite(inches, 'inches');
  return inches * POINTS_PER_INCH;
}

/**
 * Converts PDF/PostScript points to inches.
 * Formula: points / 72
 */
export function pointsToInches(points: number): number {
  assertFinite(points, 'points');
  return points / POINTS_PER_INCH;
}

// ==========================================
// Digital Pixel Conversions (Require Explicit DPI)
// ==========================================

/**
 * Converts millimeters to pixels at an explicitly supplied DPI.
 * Pixels do not have an inherent physical size.
 * Formula: (mm / 25.4) * dpi
 */
export function mmToPixels(mm: number, dpi: number): number {
  assertFinite(mm, 'mm');
  assertValidDpi(dpi);
  return (mm / MM_PER_INCH) * dpi;
}

/**
 * Converts pixels to millimeters at an explicitly supplied DPI.
 * Formula: (pixels / dpi) * 25.4
 */
export function pixelsToMm(pixels: number, dpi: number): number {
  assertFinite(pixels, 'pixels');
  assertValidDpi(dpi);
  return (pixels / dpi) * MM_PER_INCH;
}

/**
 * Converts inches to pixels at an explicitly supplied DPI.
 * Formula: inches * dpi
 */
export function inchesToPixels(inches: number, dpi: number): number {
  assertFinite(inches, 'inches');
  assertValidDpi(dpi);
  return inches * dpi;
}

/**
 * Converts pixels to inches at an explicitly supplied DPI.
 * Formula: pixels / dpi
 */
export function pixelsToInches(pixels: number, dpi: number): number {
  assertFinite(pixels, 'pixels');
  assertValidDpi(dpi);
  return pixels / dpi;
}

/**
 * Converts PDF/PostScript points to pixels at an explicitly supplied DPI.
 * Formula: (points / 72) * dpi
 */
export function pointsToPixels(points: number, dpi: number): number {
  assertFinite(points, 'points');
  assertValidDpi(dpi);
  return (points / POINTS_PER_INCH) * dpi;
}

/**
 * Converts pixels to PDF/PostScript points at an explicitly supplied DPI.
 * Formula: (pixels / dpi) * 72
 */
export function pixelsToPoints(pixels: number, dpi: number): number {
  assertFinite(pixels, 'pixels');
  assertValidDpi(dpi);
  return (pixels / dpi) * POINTS_PER_INCH;
}
