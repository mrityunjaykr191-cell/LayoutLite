"""FastAPI application for local background removal microservice."""

import io
import logging
from typing import Union
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from PIL import Image

from app.schemas import ErrorResponse, HealthResponse
from app.segmenter import SegmentationError, get_segmenter

logger = logging.getLogger("passport_photo_studio.background_removal")

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG"}

app = FastAPI(
    title="Passport Photo Studio - Background Removal Service",
    description="Local privacy-first background removal using rembg (u2netp)",
    version="0.1.0",
)

# Strict CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        content = {"error": str(exc.detail), "detail": None}
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled server error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": "An unexpected server error occurred during background removal.",
        },
    )


@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return microservice health and model readiness status."""
    segmenter = get_segmenter()
    return HealthResponse(
        status="ok",
        model=segmenter.model_name,
        ready=segmenter.is_ready(),
        device="cpu",
    )


@app.post(
    "/api/remove-background",
    responses={
        200: {
            "content": {"image/png": {}},
            "description": "Transparent PNG headshot with background removed",
        },
        400: {"model": ErrorResponse, "description": "Invalid or corrupt image"},
        413: {"model": ErrorResponse, "description": "Payload exceeds 25 MB limit"},
        415: {"model": ErrorResponse, "description": "Unsupported media format"},
        500: {"model": ErrorResponse, "description": "Inference processing error"},
    },
)
async def remove_background(file: UploadFile = File(...)) -> Response:
    """Remove background from uploaded portrait photo and return transparent PNG."""
    # 1. Quick MIME check if provided
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "error": "Unsupported media type",
                "detail": f"Content-Type '{file.content_type}' is not supported. Use image/jpeg or image/png.",
            },
        )

    # 2. Stream-read with strict 25 MB ceiling
    chunks: list[bytes] = []
    total_size = 0
    chunk_size = 64 * 1024  # 64 KB

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail={
                    "error": "File too large",
                    "detail": "The uploaded photo exceeds the maximum allowed size of 25 MB.",
                },
            )
        chunks.append(chunk)

    if total_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Empty file",
                "detail": "The uploaded file contains no data.",
            },
        )

    image_bytes = b"".join(chunks)
    chunks.clear()

    # 3. Pillow validation to verify image format and corruption
    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            format_name = pil_img.format
            pil_img.verify()
    except Exception as exc:
        logger.warning("Uploaded image failed verification: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Corrupt or invalid image",
                "detail": "The uploaded file could not be decoded as a valid image.",
            },
        ) from exc

    if format_name not in ALLOWED_PIL_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "error": "Unsupported image format",
                "detail": f"Image format '{format_name}' is not supported. Only JPEG and PNG are allowed.",
            },
        )

    # 4. In-memory segmentation
    segmenter = get_segmenter()
    try:
        output_png_bytes = segmenter.remove_background(image_bytes)
    except SegmentationError as exc:
        logger.error("Segmentation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Background removal failed",
                "detail": "AI model inference failed to isolate the subject. You can skip background removal and keep the original photo.",
            },
        ) from exc

    # 5. Return transparent PNG with strict no-store headers
    return Response(
        content=output_png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
        },
    )
