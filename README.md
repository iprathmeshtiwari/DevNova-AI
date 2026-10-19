# DevNova AI

DevNova AI is an Express-based assistant with JWT authentication, MongoDB Atlas chat history, Nebius-compatible chat completions, and a responsive browser interface.

**Live website:** https://devnova-ai.onrender.com

## Features

- Streaming text chat, authenticated conversation history, and daily message quotas.
- Optional browser speech recognition (English or Hindi where supported) and speech-synthesis playback.
- PNG, JPG/JPEG, and WebP image questions through a separately configured vision model.
- Server-side text extraction for PDF, DOCX, TXT, Markdown, CSV, and JSON.
- Source analysis for common JavaScript, TypeScript, Python, Java, C/C++, C#, Go, Rust, PHP, HTML/CSS, SQL, shell, YAML, and XML files.
- Unified composer with attachment previews, removal, file-size validation, and streaming/cancel controls.

## Technology

| Technology | Purpose |
|---|---|
| Node.js and Express | Application server and API |
| MongoDB Atlas and Mongoose | User and conversation persistence |
| Nebius Token Factory | AI text and optional vision inference |
| HTML, CSS, and JavaScript | Responsive browser interface |
| JWT and bcryptjs | Authentication |
| Helmet and express-rate-limit | HTTP security and request limits |
| Render | Existing hosting platform |

Uploads use Multer's bounded in-memory storage; `pdf-parse` extracts PDFs and `mammoth` extracts DOCX text. No uploaded bytes are written to disk.

Uploads are held in server memory only and are not written to MongoDB or temporary files. The conversation saves the user's text, a safe attachment name/type indicator, and the assistant response; it does not save the uploaded bytes or extracted document/code text. Image bytes and extracted text are sent to the configured AI provider when the user submits a request. Uploaded content is treated as untrusted input and uploaded code is never executed.

## Requirements and configuration

Use Node.js **20.16+ (excluding 21) or 22.3+** and MongoDB Atlas. The PDF extraction dependency requires those supported Node versions. Copy `.env.example` to `.env` and fill in server-side credentials:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port; defaults to `3000`. The server binds to `0.0.0.0` for cloud hosting. |
| `AI_API_KEY` | For chat | Nebius Token Factory key. Never expose it in browser code. |
| `AI_BASE_URL` | For chat | Provider API base URL; chat completions are requested at `/chat/completions`. |
| `AI_MODEL` | For text chat | Exact text-capable model ID from the provider. |
| `AI_VISION_MODEL` | For image questions | Optional exact model ID confirmed by Nebius to accept image input. Image questions return a configuration error when this is unset. |
| `JWT_SECRET` | Yes | Long, random server-side signing secret. |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string used for users and conversation history. |
| `DAILY_LIMIT` | No | Daily messages per user; defaults to `50`. |
| `MAX_IMAGE_SIZE_MB` | No | Image limit per file; defaults to `5`. |
| `MAX_DOCUMENT_SIZE_MB` | No | Document limit per file; defaults to `10`. |
| `MAX_CODE_FILE_SIZE_MB` | No | Code limit per file; defaults to `2`. |

Each configured per-file limit must be greater than zero and no more than 20 MB. A message accepts at most five files and at most 20 MB of attachments in total. Extracted text is bounded to 100,000 characters per file and 80,000 characters per request. When extracted documents exceed the request context budget, the server selects bounded, question-relevant excerpts (or evenly spaced excerpts for general requests) and tells the model to disclose that portions were omitted; oversized code context is rejected rather than silently truncated. The server also limits processing to four simultaneous chat requests per process.

### Nebius model setup

Select the exact model IDs shown in your Nebius Token Factory account/model catalog and confirm that the vision model supports OpenAI-compatible `image_url` data URLs at `/chat/completions`. Set `AI_VISION_MODEL` only after checking the current provider model documentation/catalog; model names and image support can change. This project cannot verify model capabilities without provider credentials, and a configured model may still reject unsupported image requests. Text/code/document requests continue using `AI_MODEL`.

## Local development

PowerShell:

```powershell
npm install
Copy-Item .env.example .env
# Edit .env with your own credentials
npm run dev
```

The development server is available at `http://localhost:3000` (or the configured `PORT`). For a normal start use `npm start`; run the automated extraction/validation tests with `npm test`.

## Voice, files, and limitations

- Voice input uses the browser Web Speech API; support, language availability, and microphone permissions vary by browser. A secure HTTPS origin (or localhost) is generally required. Browser speech-recognition implementations may send audio to a browser-selected speech service; raw recordings are never sent to DevNova's Express backend. Recognition produces editable text and does not submit automatically.
- Spoken replies are opt-in and use the browser's speech synthesis; availability and voices vary by device.
- Supported images are PNG, JPEG, and WebP. Image analysis requires a vision-capable configured model; no model capability is assumed by the server.
- PDF text extraction does not perform OCR. Scanned/image-only PDFs are rejected with an OCR-required message. Password-protected or malformed PDFs and malformed DOCX/CSV/JSON files are rejected with a safe error.
- The **Documents** picker treats `.txt`, `.md`, and `.json` as documents; the **Code** picker treats those same extensions as source text for code analysis.
- Documents and code are parsed in memory, with bounded file and extracted-text sizes. Large combined extracted content is rejected. Code is passed as text with a filename/language boundary and is never run.
- Files are not retained after request processing. Conversation history displays only the user's attachment name/type indicator; refreshing a page does not restore the file.

## Web search and deployment

This checkout has no SearXNG route, article retrieval implementation, or `SEARXNG_URL` consumer. Web search was not changed as part of the multimodal work. A production `SEARXNG_URL` is required only if/when a SearXNG-backed search integration is added; setting it alone does not enable search in this version.

The application requires a reachable MongoDB Atlas URI and AI credentials for chat. It uses the hosting platform's `PORT`, binds to `0.0.0.0`, and does not require Docker or local production services. Do not commit `.env`.

## Troubleshooting

- **Chat says configuration is missing:** check `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` on the server.
- **Image analysis is not configured:** set `AI_VISION_MODEL` to a currently documented vision-capable model ID and restart.
- **The AI model or endpoint was not found:** recheck the model ID and base URL in the provider catalog.
- **Microphone is unavailable:** use a browser with Web Speech API support, grant microphone permission, and use HTTPS or localhost.
- **A PDF has no extractable text:** it is likely scanned; OCR is not enabled.
- **Database startup fails:** verify `MONGODB_URI`, Atlas network access, and database credentials.

## Author

Prathmesh Tiwari · [GitHub](https://github.com/iprathmeshtiwari)
