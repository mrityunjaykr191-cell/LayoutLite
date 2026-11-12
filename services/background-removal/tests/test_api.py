"""Tests for background removal API endpoints."""

import io
import os
import tempfile
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import main as main_module
from app.config import settings
from app.main import app
from app.remove_bg_client import RemoveBgAPIError
from app.segmenter import BackgroundSegmenter, SegmentationError, set_segmenter


def create_test_image(format: str = "PNG", mode: str = "RGB", size: tuple[int, int] = (64, 64), color="blue") -> bytes:
    """Helper to generate in-memory image bytes."""
    img = Image.new(mode, size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def create_transparent_png(size: tuple[int, int] = (64, 64)) -> bytes:
    """Helper to generate in-memory transparent RGBA PNG bytes."""
    img = Image.new("RGBA", size, color=(0, 0, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class MockSuccessfulSegmenter(BackgroundSegmenter):
    """Mock segmenter returning valid transparent PNG without loading ONNX model."""

    def __init__(self) -> None:
        super().__init__(model_name="u2netp", session="mock_session")

    def remove_background(self, image_bytes: bytes) -> bytes:
        return create_transparent_png()


class MockFailingSegmenter(BackgroundSegmenter):
    """Mock segmenter simulating ONNX inference failure."""

    def __init__(self) -> None:
        super().__init__(model_name="u2netp", session="mock_session")

    def remove_background(self, image_bytes: bytes) -> bytes:
        raise SegmentationError("Simulated internal model failure")


@pytest.fixture(autouse=True)
def setup_mock_provider(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    """Keep route tests isolated from the external provider."""
    mock = MockSuccessfulSegmenter()
    set_segmenter(mock)
    monkeypatch.setattr(settings, "REMOVE_BG_API_KEY", "test-api-key")

    async def mock_remove_background(image_bytes: bytes, mime_type: str) -> bytes:
        return create_transparent_png()

    monkeypatch.setattr(main_module, "remove_bg_api", mock_remove_background)
    yield
    set_segmenter(None)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client: TestClient) -> None:
    """Test health check returns expected status and local u2netp model."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model"] == "u2netp"
    assert data["ready"] is True
    assert data["device"] == "CPU (rembg local)"


def test_health_check_remove_bg_with_api_key(client: TestClient) -> None:
    """Test health check for remove.bg engine when API key is configured."""
    response = client.get("/api/health?engine=remove_bg")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model"] == "remove.bg"
    assert data["ready"] is True
    assert data["device"] == "remote API"
    assert "test-api-key" not in response.text


def test_health_check_without_api_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test health reports missing provider configuration without claiming readiness for remove.bg."""
    monkeypatch.setattr(settings, "REMOVE_BG_API_KEY", "")

    response = client.get("/api/health?engine=remove_bg")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["ready"] is False
    assert data["error"] == "Set REMOVE_BG_API_KEY on the background-removal service."


def test_remove_background_png_success(client: TestClient) -> None:
    """Test valid PNG portrait upload returns transparent PNG with no-store headers."""
    png_bytes = create_test_image(format="PNG", mode="RGB")
    response = client.post(
        "/api/remove-background",
        files={"file": ("photo.png", png_bytes, "image/png")},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert "no-store" in response.headers["cache-control"]

    # Verify response is valid RGBA image
    result_img = Image.open(io.BytesIO(response.content))
    assert result_img.format == "PNG"
    assert result_img.mode == "RGBA"


def test_remove_background_jpeg_success(client: TestClient) -> None:
    """Test valid JPEG portrait upload returns transparent PNG."""
    jpeg_bytes = create_test_image(format="JPEG", mode="RGB")
    response = client.post(
        "/api/remove-background",
        files={"file": ("photo.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    result_img = Image.open(io.BytesIO(response.content))
    assert result_img.format == "PNG"
    assert result_img.mode == "RGBA"


def test_unsupported_mime_type(client: TestClient) -> None:
    """Test rejecting files with unsupported declared MIME types."""
    response = client.post(
        "/api/remove-background",
        files={"file": ("doc.txt", b"Hello world", "text/plain")},
    )
    assert response.status_code == 415
    data = response.json()
    assert data["error"] == "Unsupported media type"


def test_corrupt_image_data(client: TestClient) -> None:
    """Test rejecting corrupted bytes declared as JPEG."""
    corrupt_data = b"\xff\xd8\xff\xe0" + b"random garbage that cannot be decoded"
    response = client.post(
        "/api/remove-background",
        files={"file": ("corrupt.jpg", corrupt_data, "image/jpeg")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"] == "Corrupt or invalid image"


def test_empty_file_upload(client: TestClient) -> None:
    """Test rejecting 0-byte uploads."""
    response = client.post(
        "/api/remove-background",
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"] == "Empty file"


def test_unsupported_image_format(client: TestClient) -> None:
    """Test rejecting image formats other than JPEG and PNG (e.g. GIF)."""
    gif_bytes = create_test_image(format="GIF", mode="P")
    response = client.post(
        "/api/remove-background",
        files={"file": ("animation.gif", gif_bytes, "image/png")},  # Spoofed MIME, real GIF
    )
    assert response.status_code == 415
    data = response.json()
    assert data["error"] == "Unsupported image format"


def test_payload_too_large(client: TestClient) -> None:
    """Test rejecting uploads exceeding 25 MB limit."""
    oversized_size = 25 * 1024 * 1024 + 1024
    # Create large dummy byte stream
    oversized_bytes = b"0" * oversized_size
    response = client.post(
        "/api/remove-background",
        files={"file": ("large.png", oversized_bytes, "image/png")},
    )
    assert response.status_code == 413
    data = response.json()
    assert data["error"] == "File too large"


def test_local_segmenter_failure_returns_500(client: TestClient) -> None:
    """Test local segmenter failure returns clean 500 error."""
    mock = MockFailingSegmenter()
    set_segmenter(mock)

    png_bytes = create_test_image(format="PNG", mode="RGB")
    response = client.post(
        "/api/remove-background",
        files={"file": ("photo.png", png_bytes, "image/png")},
    )

    assert response.status_code == 500
    data = response.json()
    assert data["error"] == "Background removal failed"
    # Restore successful segmenter
    set_segmenter(MockSuccessfulSegmenter())


def test_provider_failure_returns_clean_502(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test remove.bg provider failure returns safe 502 error without exposing stack trace."""
    async def fail_remove_background(image_bytes: bytes, mime_type: str) -> bytes:
        raise RemoveBgAPIError("Upstream failed")

    monkeypatch.setattr(main_module, "remove_bg_api", fail_remove_background)
    png_bytes = create_test_image(format="PNG", mode="RGB")
    response = client.post(
        "/api/remove-background?engine=remove_bg",
        files={"file": ("photo.png", png_bytes, "image/png")},
    )

    assert response.status_code == 502
    data = response.json()
    assert data["error"] == "Background removal failed"
    # Ensure no traceback info is returned in payload
    assert "Traceback" not in response.text
    assert "File \"" not in response.text


def test_remove_background_forwards_validated_image(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test valid image bytes and detected MIME type are passed to the remove.bg provider."""
    forwarded: list[tuple[bytes, str]] = []

    async def capture_remove_background(image_bytes: bytes, mime_type: str) -> bytes:
        forwarded.append((image_bytes, mime_type))
        return create_transparent_png()

    monkeypatch.setattr(main_module, "remove_bg_api", capture_remove_background)
    png_bytes = create_test_image(format="PNG", mode="RGB")
    response = client.post(
        "/api/remove-background?engine=remove_bg",
        files={"file": ("photo.png", png_bytes, "image/png")},
    )

    assert response.status_code == 200
    assert forwarded == [(png_bytes, "image/png")]


def test_missing_api_key_returns_actionable_503(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test missing API credentials for remove.bg fail explicitly without making a network request."""
    from app.remove_bg_client import remove_background

    monkeypatch.setattr(settings, "REMOVE_BG_API_KEY", "")
    monkeypatch.setattr(main_module, "remove_bg_api", remove_background)
    png_bytes = create_test_image(format="PNG", mode="RGB")
    response = client.post(
        "/api/remove-background?engine=remove_bg",
        files={"file": ("photo.png", png_bytes, "image/png")},
    )

    assert response.status_code == 503
    assert response.json()["error"] == "Background removal is not configured"


def test_remove_bg_client_uses_provider_request_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test upstream URL, multipart fields, size, and server-side API key header."""
    import asyncio

    from app import remove_bg_client

    captured: dict[str, object] = {}
    png_bytes = create_transparent_png()

    class MockAsyncClient:
        def __init__(self, timeout: float) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> "MockAsyncClient":
            return self

        async def __aexit__(
            self,
            exc_type: object,
            exc: object,
            traceback: object,
        ) -> None:
            return None

        async def post(self, url: str, **kwargs: object) -> object:
            captured["url"] = url
            captured.update(kwargs)

            class MockResponse:
                status_code = 200
                is_success = True
                content = png_bytes

            return MockResponse()

    monkeypatch.setattr(settings, "REMOVE_BG_API_KEY", "test-api-key")
    monkeypatch.setattr(remove_bg_client.httpx, "AsyncClient", MockAsyncClient)

    result = asyncio.run(
        remove_bg_client.remove_background(b"input-image", "image/jpeg")
    )

    assert result == png_bytes
    assert captured["url"] == "https://api.remove.bg/v1.0/removebg"
    assert captured["data"] == {"size": "auto"}
    assert captured["headers"] == {"X-Api-Key": "test-api-key"}
    assert captured["files"] == {
        "image_file": ("photo.jpg", b"input-image", "image/jpeg")
    }


def test_zero_disk_leak(client: TestClient) -> None:
    """Test that processing requests leaves no files in service or temp directories."""
    service_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    initial_files = set(os.listdir(service_dir))

    png_bytes = create_test_image(format="PNG", mode="RGB")
    response = client.post(
        "/api/remove-background",
        files={"file": ("leak_test.png", png_bytes, "image/png")},
    )
    assert response.status_code == 200

    after_files = set(os.listdir(service_dir))
    # No new files should have been created in the service directory
    assert after_files == initial_files


def test_cors_headers(client: TestClient) -> None:
    """Test that CORS allows localhost:5173 but not unauthorized origins."""
    # Allowed origin
    res_allowed = client.options(
        "/api/remove-background",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res_allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Unauthorized origin
    res_disallowed = client.options(
        "/api/remove-background",
        headers={
            "Origin": "http://malicious-site.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res_disallowed.headers.get("access-control-allow-origin") is None


def test_segmenter_decontamination_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that BackgroundSegmenter falls back to standard cutout if decontamination fails."""
    import rembg

    calls: list[bool] = []

    def mock_rembg_remove(*args, **kwargs) -> bytes:
        decontam = kwargs.get("decontaminate", False)
        calls.append(decontam)
        if decontam:
            raise RuntimeError("Simulated decontamination algorithm error")
        return create_transparent_png()

    monkeypatch.setattr(rembg, "remove", mock_rembg_remove)

    segmenter = BackgroundSegmenter(model_name="u2netp", session="dummy", decontaminate=True)
    result_bytes = segmenter.remove_background(create_test_image())

    # Should have attempted decontaminate=True first, then fallen back to decontaminate=False
    assert calls == [True, False]
    result_img = Image.open(io.BytesIO(result_bytes))
    assert result_img.format == "PNG"
    assert result_img.mode == "RGBA"


def test_segmenter_decontamination_preserves_alpha_geometry() -> None:
    """Test that decontamination preserves alpha mask values while cleaning foreground RGB."""
    import rembg

    session = rembg.new_session("u2netp")
    segmenter_decontam = BackgroundSegmenter(model_name="u2netp", session=session, decontaminate=True)
    segmenter_naive = BackgroundSegmenter(model_name="u2netp", session=session, decontaminate=False)

    # Synthetic portrait slice: dark subject against bright background
    test_img = Image.new("RGB", (64, 64), color=(240, 240, 240))
    # Add dark foreground circle in center
    for y in range(20, 44):
        for x in range(20, 44):
            test_img.putpixel((x, y), (40, 30, 20))

    buf = io.BytesIO()
    test_img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    out_decontam = segmenter_decontam.remove_background(img_bytes)
    out_naive = segmenter_naive.remove_background(img_bytes)

    img_decontam = Image.open(io.BytesIO(out_decontam))
    img_naive = Image.open(io.BytesIO(out_naive))

    import numpy as np

    arr_decontam = np.array(img_decontam)
    arr_naive = np.array(img_naive)

    # Both must be valid RGBA PNGs
    assert img_decontam.mode == "RGBA"
    assert img_naive.mode == "RGBA"

    # Alpha channels must be identical (no mask erosion or shrinking)
    alpha_decontam = arr_decontam[:, :, 3]
    alpha_naive = arr_naive[:, :, 3]
    assert np.array_equal(alpha_decontam, alpha_naive)


def test_alpha_floor_refinement_safeguards() -> None:
    """Test that _refine_alpha_floor preserves subject opacity while attenuating sub-perceptual noise."""
    import numpy as np

    # Synthetic image with exact alpha values across the spectrum
    alphas = [0, 2, 5, 10, 15, 20, 25, 50, 100, 180, 255]
    img = Image.new("RGBA", (len(alphas), 1))
    for i, a in enumerate(alphas):
        img.putpixel((i, 0), (120, 100, 80, a))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    refined_bytes = BackgroundSegmenter._refine_alpha_floor(png_bytes, floor=5.0, ramp=25.0)
    refined_img = Image.open(io.BytesIO(refined_bytes))
    arr = np.array(refined_img)
    refined_alphas = arr[0, :, 3].tolist()

    # 1. Zero stays zero
    assert refined_alphas[0] == 0
    # 2. Values <= 5 (floor) attenuate to 0
    assert refined_alphas[1] == 0
    assert refined_alphas[2] == 0
    # 3. Transition values (10, 15, 20) ramp smoothly and monotonically: 0 < a_10 < a_15 < a_20 < 25
    assert 0 < refined_alphas[3] < refined_alphas[4] < refined_alphas[5] < 25
    # 4. Values >= 25 (subject foreground, hair, body) are 100% identical and un-eroded
    for original_idx in [6, 7, 8, 9, 10]:
        assert refined_alphas[original_idx] == alphas[original_idx]


def test_rate_limiting_enforced(client: TestClient) -> None:
    """Test that abuse protection rate limiter triggers 429 when threshold exceeded."""
    from app.rate_limiter import reset_rate_limiter
    from app.config import settings

    reset_rate_limiter()
    original_limit = settings.RATE_LIMIT_PER_MINUTE
    settings.RATE_LIMIT_PER_MINUTE = 3
    png_bytes = create_test_image(format="PNG", mode="RGB")

    try:
        # First 3 requests succeed
        for _ in range(3):
            resp = client.post(
                "/api/remove-background",
                files={"file": ("photo.png", png_bytes, "image/png")},
                headers={"X-Forwarded-For": "203.0.113.10"},
            )
            assert resp.status_code == 200

        # 4th request must be rejected with 429
        resp = client.post(
            "/api/remove-background",
            files={"file": ("photo.png", png_bytes, "image/png")},
            headers={"X-Forwarded-For": "203.0.113.10"},
        )
        assert resp.status_code == 429
        data = resp.json()
        assert data["error"] == "Rate limit exceeded"
        assert "Retry-After" in resp.headers

        # Another IP is unaffected
        resp_other = client.post(
            "/api/remove-background",
            files={"file": ("photo.png", png_bytes, "image/png")},
            headers={"X-Forwarded-For": "203.0.113.99"},
        )
        assert resp_other.status_code == 200
    finally:
        settings.RATE_LIMIT_PER_MINUTE = original_limit
        reset_rate_limiter()


def test_config_origin_parsing() -> None:
    """Test parsing and sanitization of comma-separated CORS origins."""
    from app.config import parse_origins, Settings

    origins = parse_origins("https://layoutlite.vercel.app, https://preview.vercel.app , https://example.com")
    assert origins == [
        "https://layoutlite.vercel.app",
        "https://preview.vercel.app",
        "https://example.com",
    ]

    assert parse_origins("") == []
    assert parse_origins(" ,  ,, ") == []
