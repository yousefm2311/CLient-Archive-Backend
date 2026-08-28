<div align="center">
  <img src="https://img.icons8.com/?size=100&id=46860&format=png&color=000000" alt="Archive Logo" width="120" />

  # 📦 Client Archiver Backend 

  **A robust Express.js backend system for uploading, optimizing (Ghostscript), and archiving (ZIP) PDF files, complete with storage savings analysis.**

  [![Node.js](https://img.shields.io/badge/Node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Ghostscript](https://img.shields.io/badge/Ghostscript-Ghost-lightgrey?style=for-the-badge)](#)

  [🇸🇦 عرض النسخة العربية (Arabic Version)](README.ar.md)
</div>

---

## 📖 Overview

The **Client Archiver Backend** is a highly efficient API designed for handling heavy document workloads. It allows client applications to upload multiple PDF files simultaneously. Upon receipt, the system validates the files securely, optionally compresses them using **Ghostscript** (drastically reducing file size while maintaining readability), and packages them into a single ZIP archive using streaming. 

The API securely stores archive metadata in **MongoDB**, calculating the total bytes saved through compression and providing detailed storage footprint reports.

---

## ✨ Core Features & Technical Highlights

*   **Bulk PDF Uploads:** Safely handles multipart/form-data for up to 30 files per request (configurable max 50MB per file).
*   **Intelligent PDF Optimization:** Utilizes Ghostscript to downsample and compress PDFs. Fails gracefully to the original file if a PDF is corrupted or unoptimizable.
*   **Memory-Efficient Archiving:** Employs the `archiver` library to stream files directly into a `.zip` file on disk, avoiding RAM exhaustion on large batches.
*   **Storage Savings Tracking:** Automatically calculates the byte difference between the original uploads and the final optimized ZIP archive, giving you exact metrics on space saved.
*   **Robust Security & Validation:**
    *   **MIME & Header Checks:** Verifies file extensions, MIME types, and even reads the first 4 bytes for the binary `%PDF` signature.
    *   **Path Traversal Prevention:** A custom `ensureWithinBase` utility strictly jails file reading/writing to dedicated directories.
    *   **Rate Limiting:** Protects the upload endpoints from spam and DDoS attacks (200 requests / 10 mins).
*   **Automated Cleanup:** Ephemeral temporary directories are aggressively scrubbed after successful or failed archive generation.

---

## 🏗 System Architecture & Workflow

### Processing Pipeline
1. **Request Intake:** Client hits `POST /:clientId/upload` with files.
2. **Middleware Pipeline:** Rate limiter kicks in -> Path parameters are validated via `zod` -> A unique `requestId` is assigned.
3. **Disk Spooling:** `multer` parses the multipart form and writes raw PDFs to a temporary spool directory (`uploads/temp/<clientId>/<requestId>/`).
4. **Optimization Phase:** If `PDF_OPTIMIZE=true`, the system iterates over files, spawning a Ghostscript child process for each, compressing them into an `optimized/` subfolder.
5. **Archiving Phase:** A writable stream opens for the final ZIP at `uploads/archives/<clientId>/`. Files are piped in using maximum zlib compression (level 9).
6. **Persistence:** Metadata (file names, original sizes, final ZIP size) is saved to MongoDB.
7. **Cleanup:** Temporary folders are asynchronously deleted.

### Directory Structure
```text
Archive-Backend/
├── src/
│   ├── config/             # Database connection setups
│   ├── controllers/        # Route handlers orchestrating services
│   ├── middlewares/        # Rate limits, error catching
│   ├── models/             # Mongoose Schemas (ClientArchive)
│   ├── routes/             # Express API routing logic
│   ├── services/           # Heavy lifting (Ghostscript spawns, Multer configs, Zipping)
│   ├── utils/              # Helper utilities (Zod schemas, path checks)
│   ├── app.js              # Express app wiring
│   └── server.js           # Server instantiation
├── test/                   # Jest + Supertest suites
└── uploads/                # Dynamic storage (temp & archives)
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and adjust based on your deployment environment.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the Express server binds to | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/client_archiver` |
| `UPLOAD_TEMP_DIR` | Absolute or relative path for temporary spooling | `D:\client-documents\temp` |
| `UPLOAD_ARCHIVE_DIR` | Absolute or relative path for permanent ZIP storage | `D:\client-documents\archives` |
| `MAX_FILES` | Max allowed files per upload batch | `30` |
| `MAX_FILE_SIZE_MB` | Max size for a single PDF file (in MB) | `50` |
| `PDF_OPTIMIZE` | Enable Ghostscript PDF compression (`true`/`false`) | `true` |
| `PDF_HEADER_CHECK` | Validate the binary `%PDF` signature (`true`/`false`) | `true` |
| `PDF_GS_PATH` | Path to the Ghostscript executable (e.g. `gs`, `gswin64c.exe`) | `gs` |
| `PDF_GS_PRESET` | Ghostscript PDF settings preset (`screen`, `ebook`, `printer`) | `screen` |

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js**: >= v18.x
*   **MongoDB**: Running instance (Local or Atlas)
*   **Ghostscript**: Must be installed and reachable in your OS PATH (or set explicitly via `PDF_GS_PATH`).

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Archive-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   # Development mode (nodemon)
   npm run dev

   # Production mode
   npm start
   ```

---

## 🔗 API Reference

Base URL: `http://localhost:5000/api/archives`

### `POST /:clientId/upload`
Uploads files and creates an archive.
*   **Content-Type**: `multipart/form-data`
*   **Body Payload**: `files` (Multiple PDF files)
*   **Response**: Returns the new `archiveId`, URL to download, and bytes saved statistics.

### `GET /client/:clientId`
Lists all generated archives for a specific client. Returns an array of archive metadata objects, sorted newest first.

### `GET /:archiveId`
Retrieves detailed metadata for a specific archive.

### `GET /:archiveId/download`
Streams the ZIP file back to the client. Sets proper `Content-Disposition` headers.

### `DELETE /:archiveId`
Deletes the archive ZIP file from the file system and removes its metadata document from MongoDB.

### `GET /health`
Returns system health status.

---

## 🧪 Testing

The project uses **Jest** and **Supertest** for automated integration testing.

```bash
npm test
```
*Note: Make sure your MongoDB is running. The test suite automatically isolates data into a `client_archiver_test` database.*

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
