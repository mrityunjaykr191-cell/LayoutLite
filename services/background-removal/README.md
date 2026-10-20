# Background Removal Service (Phase 4B Proof of Concept)

A lightweight, privacy-first local microservice for optional portrait background removal using [`rembg`](https://github.com/danielgatis/rembg) and the fast `u2netp` model on CPU.

---

## 1. Key Features & Guarantees

- **Local-Only Binding**: Listens exclusively on `127.0.0.1:8000` (loopback interface; never exposed to local network).
- **Strict CORS**: Accepts cross-origin requests solely from `http://localhost:5173` and `http://127.0.0.1:5173`.
- **Zero Photo Retention**: All processing is strictly in-memory using `io.BytesIO`. Images are never written to disk, databases, or temporary caches.
- **Fast Lightweight Model**: Configured with `u2netp` (~4.7 MB ONNX weights) for fast, responsive CPU inference.
- **Strict Boundary Validation**:
  - Rejects payloads exceeding 25 MB with `413 Content Too Large`.
  - Rejects empty uploads with `400 Bad Request`.
  - Inspects real image byte headers via Pillow, allowing only valid JPEG and PNG portraits.
  - Safe error handling: never leaks Python tracebacks to clients.

---

## 2. Directory Layout

```
services/background-removal/
├── .venv/               # Isolated Python 3.11 virtual environment
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application, route handlers, and CORS
│   ├── schemas.py       # Pydantic response models
│   └── segmenter.py     # u2netp session manager and in-memory inference
├── tests/
│   ├── __init__.py
│   └── test_api.py      # Automated pytest suite (offline, deterministic)
├── README.md
├── requirements.txt     # Pinned Python dependencies
└── run.py               # Local Uvicorn runner bound to 127.0.0.1:8000
```

---

## 3. Setup & Development (PowerShell)

### Virtual Environment Setup
The virtual environment is already initialized at `services/background-removal/.venv`. To activate it in PowerShell:

```powershell
cd services\background-removal
.\.venv\Scripts\Activate.ps1
```

If reinstalling dependencies:
```powershell
pip install -r requirements.txt
```

---

## 4. Running the Microservice

From the `services/background-removal` directory:

```powershell
.\.venv\Scripts\python.exe run.py
```

The service will start at:
- **Base URL**: `http://127.0.0.1:8000`
- **Interactive OpenAPI Docs**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/health`

---

## 5. API Reference

### `GET /api/health`
Checks whether the microservice is running and ready.

**Response (200 OK)**:
```json
{
  "status": "ok",
  "model": "u2netp",
  "ready": false,
  "device": "cpu"
}
```
*(Note: `ready` becomes `true` once the session model is loaded into memory on first request or startup).*

---

### `POST /api/remove-background`
Accepts a single portrait photo as multipart form data and returns a transparent PNG with the background removed.

- **Request**: `multipart/form-data`
  - Field: `file` (Binary image data: `.jpg`, `.jpeg`, or `.png`, max 25 MB).
- **Response (200 OK)**:
  - `Content-Type`: `image/png`
  - `Cache-Control`: `no-store, no-cache, must-revalidate`
  - Body: Binary transparent PNG data.
- **Error Responses**:
  - `400 Bad Request`: Empty or corrupted image bytes.
  - `413 Content Too Large`: Upload exceeds 25 MB limit.
  - `415 Unsupported Media Type`: Declared or detected format is not JPEG or PNG.
  - `500 Internal Server Error`: Segmentation model error (safe, non-leaking message).

---

## 6. Running Tests

Run the test suite using pytest:

```powershell
.\.venv\Scripts\pytest.exe tests -v
```

All 11 automated tests run in seconds completely offline with a mock segmenter, verifying:
1. Health endpoint status and schema.
2. PNG removal returning transparent RGBA PNG.
3. JPEG removal returning transparent RGBA PNG.
4. Unsupported MIME type rejection (415).
5. Corrupted image byte rejection (400).
6. Empty file upload rejection (400).
7. Unsupported image format (e.g. GIF) rejection (415).
8. Payload exceeding 25 MB rejection (413).
9. Safe 500 error reporting without traceback leakage.
10. Zero disk file leak verification.
11. CORS header restrictions.

---

## 7. Manual Smoke Test (PowerShell)

To test against the live service with a test image:

```powershell
# 1. Start server in a separate terminal:
.\.venv\Scripts\python.exe run.py

# 2. Check health:
curl.exe http://127.0.0.1:8000/api/health

# 3. Test background removal with a sample portrait:
curl.exe -X POST "http://127.0.0.1:8000/api/remove-background" `
  -F "file=@path\to\portrait.jpg" `
  --output "output_transparent.png"
```
*(On first execution with real `rembg`, `u2netp.onnx` (~4.7 MB) will automatically download once to `~/.u2net/u2netp.onnx`).*
