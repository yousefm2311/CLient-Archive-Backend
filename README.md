# Archive Backend

Express + MongoDB service for uploading up to 10 PDF files, archiving them into a single ZIP, and storing metadata for savings analysis.

## Setup
- Prereqs: Node.js (latest LTS), MongoDB running locally, npm.
- Install deps: `npm install`
- Copy env: `cp .env.example .env` (adjust as needed)
- Run MongoDB locally (example): `mongod --dbpath ./data/db --port 27017`
- Start dev server: `npm run dev` (or `npm start`)

## Environment
- `PORT` (default 5000)
- `MONGO_URI` e.g., `mongodb://127.0.0.1:27017/client_archiver`
- `BASE_URL` e.g., `http://localhost:5000`
- `UPLOAD_TEMP_DIR` default `uploads/temp`
- `UPLOAD_ARCHIVE_DIR` default `uploads/archives`
- `MAX_FILES` default `10`
- `MAX_FILE_SIZE_MB` default `50` (per file)
- `PDF_OPTIMIZE` (optional, default `false`) — set to `true` to run Ghostscript optimization before zipping.
- `PDF_GS_PATH` (optional, default `gs`) — path to Ghostscript binary.
- `PDF_GS_PRESET` (default `screen`) — Ghostscript preset (`screen`, `ebook`, etc.).
- `PDF_GS_COLOR_DPI` / `PDF_GS_GRAY_DPI` / `PDF_GS_MONO_DPI` — downsample resolutions (default 96/96/300).

## Key Endpoints (base: `/api/archives`)
- `POST /:clientId/upload` — multipart `files` (up to 10 PDFs). Response: `clientId, archiveId, totalOriginalBytes, archivedBytes, savingsBytes, savingsPercent, archiveDownloadUrl, fileCount`.
- `GET /:archiveId` — archive metadata.
- `GET /:archiveId/download` — streams the ZIP.
- `GET /client/:clientId` — list client archives (latest first).
- `DELETE /:archiveId` — remove archive file + record.

Rate limit: upload endpoint capped at 30 requests per 10 minutes per IP. Only PDFs (mimetype + `.pdf` extension) up to 50MB each by default.

## Storage Behavior
- Incoming PDFs land in `uploads/temp/<clientId>/<requestId>/` via Multer disk storage.
- Archiving streams files into one ZIP at `uploads/archives/<clientId>/<archiveId>.zip` (no full-file buffering).
- After ZIP is created, the temp folder is removed.
- MongoDB stores archive metadata including original file sizes, archived size, and relative archive path (no absolute paths returned).

## Curl Examples
- Upload multiple PDFs:
  ```bash
  curl -X POST http://localhost:5000/api/archives/ACME/upload \
    -F "files=@/path/to/file1.pdf" \
    -F "files=@/path/to/file2.pdf"
  ```
- Download ZIP:
  ```bash
  curl -L -o ACME-archive.zip http://localhost:5000/api/archives/<archiveId>/download
  ```

## Postman Quick Notes
- Set request type to `POST` with `form-data` body; key `files` marked as `File`, add up to 10 entries.
- For download, set request to `GET` and enable "Send and Download".
- Base URL environment: `{{baseUrl}} = http://localhost:5000` then use `{{baseUrl}}/api/archives/{{archiveId}}/download`.

## Testing
- Lightweight PDF fixture: `test/fixtures/sample.pdf`.
- Run tests (requires Mongo running; uses `client_archiver_test` by default): `npm test`
- Test covers upload endpoint response keys via Supertest.

## Project Structure
- `src/` — app, routes, controllers, services, models, utils, middleware.
- `uploads/temp` — transient uploads (cleaned after archiving).
- `uploads/archives` — stored ZIP archives.
- `test/` — jest + supertest, fixtures.

## Notes
- ZIP creation uses streaming `archiver` + `createWriteStream` to avoid loading files in memory.
- Paths are normalized and constrained to `UPLOAD_ARCHIVE_DIR` to prevent traversal.
- Savings reported as bytes reduction and percentage based on original total vs archived ZIP size; upload up to 10 PDFs in one call to gauge storage impact.
- Optional PDF optimization: enable `PDF_OPTIMIZE=true` (requires Ghostscript installed and reachable via `PDF_GS_PATH`), which runs a recompress step before zipping to shrink PDFs further.
