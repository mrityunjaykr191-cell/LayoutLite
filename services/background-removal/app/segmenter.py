"""Model session manager and background removal processing."""

import logging
from typing import Any, Optional
import rembg

logger = logging.getLogger(__name__)


class SegmentationError(Exception):
    """Raised when background removal inference or initialization fails."""
    pass


class BackgroundSegmenter:
    """Encapsulates rembg session lifecycle and in-memory background removal."""

    def __init__(
        self,
        model_name: str = "u2netp",
        session: Optional[Any] = None,
        decontaminate: bool = True,
    ) -> None:
        self.model_name = model_name
        self._session = session
        self.decontaminate = decontaminate

    @property
    def session(self) -> Any:
        if self._session is None:
            logger.info("Initializing rembg session for model '%s'", self.model_name)
            try:
                self._session = rembg.new_session(self.model_name)
            except Exception as exc:
                logger.error("Failed to initialize rembg session: %s", exc)
                raise SegmentationError("Failed to initialize background removal model") from exc
        return self._session

    def is_ready(self) -> bool:
        """Return True if model session is loaded and ready for inference."""
        return self._session is not None

    def remove_background(self, image_bytes: bytes) -> bytes:
        """Process image bytes and return transparent PNG bytes in-memory."""
        try:
            try:
                output_bytes = rembg.remove(
                    image_bytes,
                    session=self.session,
                    decontaminate=self.decontaminate,
                )
            except Exception as decontam_exc:
                if self.decontaminate:
                    logger.warning(
                        "Foreground decontamination failed (%s), falling back to standard cutout",
                        decontam_exc,
                    )
                    output_bytes = rembg.remove(
                        image_bytes,
                        session=self.session,
                        decontaminate=False,
                    )
                else:
                    raise
            # Smoothly attenuate sub-perceptual background interpolation noise (< 2% opacity)
            # caused by Lanczos upscaling interpolation without eroding fine hair strands
            output_bytes = self._refine_alpha_floor(output_bytes)
            return output_bytes
        except SegmentationError:
            raise
        except Exception as exc:
            logger.error("Segmentation inference failed: %s", exc)
            raise SegmentationError("Background removal inference failed") from exc

    @staticmethod
    def _refine_alpha_floor(png_bytes: bytes, floor: float = 5.0, ramp: float = 25.0) -> bytes:
        """Smoothly attenuate sub-perceptual background interpolation ripples without hard thresholding."""
        import io
        from PIL import Image
        import numpy as np

        try:
            with Image.open(io.BytesIO(png_bytes)) as img:
                if img.mode != "RGBA":
                    return png_bytes
                arr = np.array(img)
                alpha = arr[:, :, 3].astype(np.float32)

                # Hermite cubic smoothstep for smooth continuous transition
                t = np.clip((alpha - floor) / (ramp - floor), 0.0, 1.0)
                smooth_t = t * t * (3.0 - 2.0 * t)
                attenuated_alpha = np.where(
                    alpha <= floor,
                    0.0,
                    np.where(alpha >= ramp, alpha, smooth_t * ramp),
                )
                arr[:, :, 3] = np.clip(attenuated_alpha, 0, 255).astype(np.uint8)

                out_bio = io.BytesIO()
                Image.fromarray(arr).save(out_bio, format="PNG")
                return out_bio.getvalue()
        except Exception as exc:
            logger.warning("Alpha floor refinement failed, returning original cutout: %s", exc)
            return png_bytes


# Module-level default segmenter singleton
_default_segmenter: Optional[BackgroundSegmenter] = None


def get_segmenter() -> BackgroundSegmenter:
    global _default_segmenter
    if _default_segmenter is None:
        _default_segmenter = BackgroundSegmenter(model_name="u2netp")
    return _default_segmenter


def set_segmenter(segmenter: Optional[BackgroundSegmenter]) -> None:
    """Allow overriding the segmenter singleton (e.g. for testing)."""
    global _default_segmenter
    _default_segmenter = segmenter
