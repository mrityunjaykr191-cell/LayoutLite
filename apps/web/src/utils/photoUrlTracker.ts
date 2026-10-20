/**
 * Object URL Lifecycle Tracker for Passport Photo Studio.
 *
 * Guarantees that active blob URLs remain valid while the user is actively
 * editing or previewing photos, while strictly revoking superseded URLs
 * or cleaning up on reset and unmount to prevent browser memory leaks.
 */

export interface PhotoUrlTracker {
  getRawUrl: () => string | null;
  getCroppedUrl: () => string | null;
  getCutoutUrl: () => string | null;
  getCompositedUrl: () => string | null;
  setRawPhotoUrl: (newRawUrl: string) => void;
  setCroppedPhotoUrl: (newCroppedUrl: string | null) => void;
  setCutoutUrl: (newCutoutUrl: string | null) => void;
  setCompositedUrl: (newCompositedUrl: string | null) => void;
  reset: () => void;
  cleanup: () => void;
}

export type RevokeFn = (url: string) => void;

export function createPhotoUrlTracker(
  revoker: RevokeFn = (url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Safe ignore in non-browser test environments
    }
  }
): PhotoUrlTracker {
  let rawUrl: string | null = null;
  let croppedUrl: string | null = null;
  let cutoutUrl: string | null = null;
  let compositedUrl: string | null = null;

  return {
    getRawUrl: () => rawUrl,
    getCroppedUrl: () => croppedUrl,
    getCutoutUrl: () => cutoutUrl,
    getCompositedUrl: () => compositedUrl,

    setRawPhotoUrl: (newRawUrl: string) => {
      // If replacing an existing raw photo, revoke the old one
      if (rawUrl && rawUrl !== newRawUrl) {
        revoker(rawUrl);
      }
      rawUrl = newRawUrl;

      // When a new master photo is set, all downstream derived URLs are superseded
      if (croppedUrl) {
        revoker(croppedUrl);
        croppedUrl = null;
      }
      if (cutoutUrl) {
        revoker(cutoutUrl);
        cutoutUrl = null;
      }
      if (compositedUrl) {
        revoker(compositedUrl);
        compositedUrl = null;
      }
    },

    setCroppedPhotoUrl: (newCroppedUrl: string | null) => {
      // Revoke superseded crop result URL, but NEVER revoke the raw source URL!
      if (croppedUrl && croppedUrl !== newCroppedUrl) {
        revoker(croppedUrl);
      }
      croppedUrl = newCroppedUrl;

      // When crop changes, any previous cutout and composited URLs are obsolete
      if (cutoutUrl) {
        revoker(cutoutUrl);
        cutoutUrl = null;
      }
      if (compositedUrl) {
        revoker(compositedUrl);
        compositedUrl = null;
      }
    },

    setCutoutUrl: (newCutoutUrl: string | null) => {
      // Revoke superseded cutout URL, but preserve raw and crop URLs!
      if (cutoutUrl && cutoutUrl !== newCutoutUrl) {
        revoker(cutoutUrl);
      }
      cutoutUrl = newCutoutUrl;

      // When a new cutout is set, any prior composited image is superseded
      if (compositedUrl) {
        revoker(compositedUrl);
        compositedUrl = null;
      }
    },

    setCompositedUrl: (newCompositedUrl: string | null) => {
      // Revoke superseded composited preview URL
      if (compositedUrl && compositedUrl !== newCompositedUrl) {
        revoker(compositedUrl);
      }
      compositedUrl = newCompositedUrl;
    },

    reset: () => {
      if (rawUrl) {
        revoker(rawUrl);
        rawUrl = null;
      }
      if (croppedUrl) {
        revoker(croppedUrl);
        croppedUrl = null;
      }
      if (cutoutUrl) {
        revoker(cutoutUrl);
        cutoutUrl = null;
      }
      if (compositedUrl) {
        revoker(compositedUrl);
        compositedUrl = null;
      }
    },

    cleanup: () => {
      if (rawUrl) {
        revoker(rawUrl);
        rawUrl = null;
      }
      if (croppedUrl) {
        revoker(croppedUrl);
        croppedUrl = null;
      }
      if (cutoutUrl) {
        revoker(cutoutUrl);
        cutoutUrl = null;
      }
      if (compositedUrl) {
        revoker(compositedUrl);
        compositedUrl = null;
      }
    },
  };
}
