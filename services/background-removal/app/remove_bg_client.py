"""In-memory client for the remove.bg background-removal API."""

import logging
from io import BytesIO

import httpx
from PIL import Image, UnidentifiedImageError

from app.config import settings

logger = logging.getLogger(__name__)

REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg"
REQUEST_TIMEOUT_SECONDS = 60.0
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class RemoveBgNotConfiguredError(Exception):
    """Raised when the API key is missing."""


class RemoveBgAPIError(Exception):
    """Raised when the upstream API request fails."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


async def remove_background(image_bytes: bytes, mime_type: str) -> bytes:
    """Send an image to remove.bg and return its validated PNG response."""
    api_key = settings.REMOVE_BG_API_KEY
    if not api_key:
        raise RemoveBgNotConfiguredError("REMOVE_BG_API_KEY is not configured")

    filename = "photo.jpg" if mime_type == "image/jpeg" else "photo.png"
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                REMOVE_BG_URL,
                files={"image_file": (filename, image_bytes, mime_type)},
                data={"size": "auto"},
                headers={"X-Api-Key": api_key},
            )
    except httpx.TimeoutException as exc:
        raise RemoveBgAPIError(
            "The remove.bg request timed out. Please try again.",
            status_code=504,
        ) from exc
    except httpx.RequestError as exc:
        raise RemoveBgAPIError(
            "Could not connect to the remove.bg service."
        ) from exc

    if not response.is_success:
        logger.warning("remove.bg returned HTTP %d", response.status_code)
        if response.status_code in {401, 403}:
            raise RemoveBgAPIError(
                "remove.bg rejected the API key. Verify REMOVE_BG_API_KEY on the service."
            )
        if response.status_code == 402:
            raise RemoveBgAPIError(
                "The remove.bg account has insufficient processing credits."
            )
        if response.status_code == 429:
            raise RemoveBgAPIError(
                "remove.bg rate limit reached. Wait before trying again.",
                status_code=429,
            )
        raise RemoveBgAPIError("The remove.bg service rejected the request.")

    if not response.content.startswith(PNG_SIGNATURE):
        raise RemoveBgAPIError("The remove.bg service returned an invalid image.")

    try:
        with Image.open(BytesIO(response.content)) as output_image:
            if output_image.format != "PNG":
                raise RemoveBgAPIError("The remove.bg service returned a non-PNG image.")
            if "A" not in output_image.getbands() and "transparency" not in output_image.info:
                raise RemoveBgAPIError("The remove.bg service returned an opaque PNG image.")
            output_image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise RemoveBgAPIError(
            "The remove.bg service returned an invalid PNG image."
        ) from exc

    return response.content
