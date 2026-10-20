/**
 * Solid background color compositing utility for Passport Photo Studio.
 * Composites a transparent PNG portrait cutout over a selected solid color locally via 2D Canvas.
 */

export interface ColorPreset {
  readonly id: string;
  readonly name: string;
  readonly hex: string;
  readonly description: string;
}

export const COLOR_PRESETS: readonly ColorPreset[] = Object.freeze([
  {
    id: 'white',
    name: 'White',
    hex: '#FFFFFF',
    description: 'Clean solid white background',
  },
  {
    id: 'off-white',
    name: 'Off-White',
    hex: '#F8F9FA',
    description: 'Soft off-white neutral background',
  },
  {
    id: 'light-blue',
    name: 'Light Blue',
    hex: '#E6F0FA',
    description: 'Solid light blue background',
  },
  {
    id: 'light-gray',
    name: 'Light Gray',
    hex: '#EDEDED',
    description: 'Subtle light gray neutral background',
  },
]);

export const DEFAULT_BACKGROUND_COLOR = '#FFFFFF';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Validates if a string is a valid 3 or 6 digit hex color code.
 */
export function isValidHexColor(hex: string): boolean {
  if (typeof hex !== 'string') return false;
  return HEX_COLOR_REGEX.test(hex.trim());
}

/**
 * Normalizes a hex color code to a standard 6-digit uppercase format (e.g. #fff -> #FFFFFF).
 */
export function normalizeHexColor(hex: string): string {
  if (!isValidHexColor(hex)) {
    throw new Error(`Invalid hex color string: "${hex}". Expected format #RGB or #RRGGBB.`);
  }

  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    const r = clean[0]!;
    const g = clean[1]!;
    const b = clean[2]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return `#${clean}`.toUpperCase();
}

export interface CompositedPhotoResult {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  readonly backgroundColorHex: string;
}

/**
 * Composites an image (transparent PNG cutout) over a solid color background.
 * Purely client-side canvas rendering with zero network requests.
 */
export async function compositeImageOverColor(
  source: Blob | ImageBitmap | HTMLImageElement,
  backgroundColorHex: string,
  outputType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.95
): Promise<CompositedPhotoResult> {
  const normalizedColor = normalizeHexColor(backgroundColorHex);

  let width: number;
  let height: number;
  let drawable: ImageBitmap | HTMLImageElement;
  let shouldCloseBitmap = false;

  if (source instanceof Blob) {
    if (typeof createImageBitmap === 'function') {
      drawable = await createImageBitmap(source);
      shouldCloseBitmap = true;
      width = drawable.width;
      height = drawable.height;
    } else {
      // Browser fallback using HTMLImageElement
      const url = URL.createObjectURL(source);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image for compositing'));
          img.src = url;
        });
        drawable = img;
        width = img.naturalWidth;
        height = img.naturalHeight;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } else if ('naturalWidth' in source) {
    drawable = source;
    width = source.naturalWidth;
    height = source.naturalHeight;
  } else {
    drawable = source;
    width = source.width;
    height = source.height;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not acquire 2D canvas context for compositing');
    }

    // 1. Fill solid background color
    ctx.fillStyle = normalizedColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw portrait subject over solid background
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(drawable, 0, 0, width, height);

    // 3. Export to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas export to blob failed'));
        },
        outputType,
        quality
      );
    });

    return {
      blob,
      width,
      height,
      backgroundColorHex: normalizedColor,
    };
  } finally {
    if (shouldCloseBitmap && 'close' in drawable && typeof drawable.close === 'function') {
      drawable.close();
    }
  }
}
