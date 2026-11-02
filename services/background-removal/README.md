# Background Removal Service (Phase 4B Proof of Concept)

A FastAPI service that validates portraits and forwards them in memory to the remove.bg API. Photos are sent to remove.bg for processing. The API key is configured on the server and is never exposed to the web client.

---

## 1. Key Features & Guarantees

- **Server-Side API Key**: Reads the remove.bg API key from `REMOVE_BG_API_KEY`.
- **Strict CORS**: Accepts cross-origin requests solely from `http://localhost:5173` and `http://127.0.0.1:5173`.
- **In-Memory Forwarding**: Uploaded and returned images are not written to disk by this service.
- **Provider Processing**: Forwards the validated image to `https://api.remove.bg/v1.0/removebg` as `image_file`, with `size=auto`.
- **Strict Boundary Validation**:
  - Rejects payloads exceeding 25 MB with `413 Content Too Large`.
  - Rejects empty uploads with `400 Bad Request`.
  - Inspects real image byte headers via Pillow, allowing only valid JPEG and PNG portraits.
  - Safe error handling: never leaks Python tracebacks or the API key to clients.

---

## 2. Directory Layout

```
services/background-removal/
├── .venv/               # Isolated Python 3.11 virtual environment
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application, route handlers, and CORS
│   ├── schemas.py       # Pydantic response models
│   ├── segmenter.py     # Retained legacy local segmentation implementation
│   └── remove_bg_client.py # In-memory remove.bg API client
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
  "model": "remove.bg",
  "ready": false,
  "device": "remote API"
}
```
(`ready` is `true` when `REMOVE_BG_API_KEY` is configured.)

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
  - `413 Content Too Large`: Upload exceeds maximum allowed limit.
  - `415 Unsupported Media Type`: Declared or detected format is not JPEG or PNG.
  - `429 Too Many Requests`: Abuse protection sliding-window rate limit exceeded.
  - `429 Too Many Requests`: remove.bg rate limit reached.
  - `502 Bad Gateway` / `504 Gateway Timeout`: remove.bg request failed or timed out.
  - `503 Service Unavailable`: `REMOVE_BG_API_KEY` is not configured.

---

## 6. Environment Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ENVIRONMENT` | `development` | Deployment environment (`development` or `production`). In production, wildcard CORS `*` is disallowed. |
| `HOST` | `127.0.0.1` | Loopback address for local runs; container binds to `0.0.0.0`. |
| `PORT` | `8000` | Port to listen on (automatically injected by Cloud Run). |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed origins (e.g. Vercel deployment URL). |
| `MAX_FILE_SIZE_BYTES` | `26214400` (25 MB) | Payload ceiling. |
| `RATE_LIMIT_ENABLED` | `true` | Abuse protection toggle. |
| `RATE_LIMIT_PER_MINUTE` | `20` | Max requests per IP per minute for background removal. |
| `REMOVE_BG_API_KEY` | *(required)* | Secret API key for remove.bg. Configure it in the service environment or a secret manager; never put it in frontend configuration or source control. |

---

## 7. Containerization & Cloud Run

Build the container image using Docker:
```bash
docker build -t layoutlite-bg-removal:latest .
```

Or submit to Google Cloud Build without a local Docker engine:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/layoutlite-bg-removal:latest
```

Run locally:
```bash
docker run -p 8000:8000 -e ALLOWED_ORIGINS="http://localhost:5173" -e REMOVE_BG_API_KEY layoutlite-bg-removal:latest
```

---

## 8. Running Tests

Run the test suite using pytest:

```powershell
.\.venv\Scripts\pytest.exe tests -v
```

The automated API tests mock the provider and do not call remove.bg. Coverage includes:
1. Health endpoint status and schema.
2. PNG removal returning transparent RGBA PNG.
3. JPEG removal returning transparent RGBA PNG.
4. Unsupported MIME type rejection (415).
5. Corrupted image byte rejection (400).
6. Empty file upload rejection (400).
7. Unsupported image format (e.g. GIF) rejection (415).
8. Payload exceeding 25 MB rejection (413).
9. Safe upstream error reporting without traceback or API key leakage.
10. Zero disk file leak verification.
11. CORS header restrictions.
12. Missing API-key handling.
13. Forwarding of image bytes with detected MIME type.
14. remove.bg URL, multipart fields, size, and API-key header.

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
Set `REMOVE_BG_API_KEY` in the environment before starting the service. Requests to remove.bg require internet access and may be subject to the provider's account limits.
