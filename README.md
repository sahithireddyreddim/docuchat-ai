# DocuChat AI — RAG-Powered Document Q&A Chatbot

> Upload PDFs, DOCX, and text files and get AI-powered answers with source citations, streaming responses, and conversation memory. Built for freelance portfolio and small business clients.

---

## Features

| Feature | Details |
|---|---|
| **Document Upload** | PDF, DOCX, TXT · Drag & drop · Multi-file · 50MB limit |
| **OCR Support** | Automatically extracts text from scanned PDFs |
| **Vector Search** | Semantic similarity search via ChromaDB |
| **Streaming Responses** | Token-by-token output like ChatGPT |
| **Source Citations** | Shows which document/chunk the answer came from with similarity scores |
| **Conversation Memory** | Multi-turn conversations with history |
| **Voice Input** | Browser-native speech-to-text (Web Speech API) |
| **PDF Export** | Export full chat conversations as PDF |
| **Multi-document Query** | Filter and query specific documents |
| **Auth System** | Signup/login/JWT · Per-user document isolation |
| **Admin Panel** | User management, platform stats, toggle accounts |
| **100% Free Stack** | Groq free tier + local embeddings + SQLite + ChromaDB |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        FRONTEND                          │
│  Next.js 15 + Tailwind CSS + React Markdown              │
│  Pages: Login · Signup · Chat · Documents · Admin        │
└───────────────────┬─────────────────────────────────────┘
                    │ REST API + SSE streaming
┌───────────────────▼─────────────────────────────────────┐
│                        BACKEND                           │
│  FastAPI (Python) + SQLAlchemy + SQLite                  │
│  Routers: /auth · /documents · /chat · /admin            │
└──────┬──────────────────┬──────────────────┬────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼──────┐  ┌────────▼────────┐
│  ChromaDB   │  │ Sentence-     │  │   Groq LLM      │
│  (vectors)  │  │ Transformers  │  │ llama-3.1-8b    │
│  local/free │  │ (embeddings)  │  │ free tier       │
└─────────────┘  └───────────────┘  └─────────────────┘
```

### RAG Pipeline Flow

```
User Question
     │
     ▼
Embed question → ChromaDB semantic search → Top 5 chunks
                                                  │
                                                  ▼
                              Chat history + System prompt + Context
                                                  │
                                                  ▼
                                         Groq LLM (streaming)
                                                  │
                                                  ▼
                              Answer + Source citations → User
```

---

## Tech Stack (All Free)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15, TypeScript | Fast, SEO-friendly, App Router |
| Styling | Tailwind CSS | Rapid UI development |
| Backend | FastAPI (Python) | Async, fast, great docs |
| Database | SQLite + SQLAlchemy | No setup, perfect for demos |
| Embeddings | sentence-transformers | Local, no API key needed |
| Vector DB | ChromaDB | Local persistent storage |
| LLM | Groq (llama-3.1-8b) | Free tier, very fast inference |
| Auth | JWT (python-jose) | Secure, stateless |
| OCR | pytesseract + pdf2image | Free, handles scanned PDFs |

---

## Project Structure

```
rag-chatbot/
├── README.md
├── .env.example                    # Environment template
├── sample-docs/
│   └── sample.txt                  # Test document
│
├── backend/
│   ├── requirements.txt
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Settings (pydantic)
│   ├── database.py                 # SQLAlchemy async setup
│   ├── models/
│   │   ├── user.py                 # User table
│   │   └── document.py             # Document, ChatSession, ChatMessage
│   ├── routers/
│   │   ├── auth.py                 # /auth/signup, /login, /me
│   │   ├── documents.py            # /documents/upload, list, delete
│   │   ├── chat.py                 # /chat/stream, /sessions
│   │   └── admin.py                # /admin/stats, users
│   ├── services/
│   │   ├── document_processor.py   # PDF/DOCX/TXT/OCR extraction
│   │   ├── vector_store.py         # ChromaDB operations
│   │   ├── llm_service.py          # Groq streaming
│   │   └── rag_service.py          # RAG orchestration
│   └── utils/
│       ├── auth_utils.py           # JWT + password hashing
│       └── file_utils.py           # File save/delete/validate
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── app/
    │   ├── layout.tsx              # Root layout + toast provider
    │   ├── page.tsx                # Auth redirect
    │   ├── login/page.tsx          # Login page
    │   ├── signup/page.tsx         # Signup page
    │   ├── chat/page.tsx           # Main chat interface
    │   ├── documents/page.tsx      # Document management
    │   └── admin/page.tsx          # Admin dashboard
    ├── components/
    │   ├── Navbar.tsx
    │   ├── chat/
    │   │   ├── ChatInterface.tsx   # Main chat UI
    │   │   ├── MessageBubble.tsx   # Message rendering + markdown
    │   │   ├── SourceCitation.tsx  # Source accordion
    │   │   └── VoiceInput.tsx      # Speech recognition
    │   └── documents/
    │       ├── FileUpload.tsx      # Drag-and-drop uploader
    │       └── DocumentList.tsx    # Document management list
    ├── hooks/
    │   └── useChat.ts              # Chat state + streaming logic
    └── lib/
        ├── api.ts                  # All API calls + SSE streaming
        ├── auth.ts                 # Token storage helpers
        └── utils.ts                # Formatting + PDF export
```

---

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- Tesseract OCR (for scanned PDFs)
- A free Groq API key from [console.groq.com](https://console.groq.com)

### 1. Install Tesseract OCR

```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr poppler-utils

# macOS
brew install tesseract poppler

# Windows
# Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
```

### 2. Clone and Setup Backend

```bash
# Navigate to backend
cd rag-chatbot/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp ../.env.example .env
# Edit .env and add your GROQ_API_KEY
nano .env
```

### 3. Get Your Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create an API key
4. Add it to `backend/.env`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

### 4. Start the Backend

```bash
# From backend/ directory (with venv activated)
uvicorn main:app --reload --port 8000
```

Backend is live at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 5. Setup Frontend

```bash
# In a new terminal
cd rag-chatbot/frontend

# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local

# Start development server
npm run dev
```

Frontend is live at: http://localhost:3000

### 6. First Run

1. Open http://localhost:3000
2. Click "Create one free" to sign up
3. Go to **Documents** tab
4. Upload `sample-docs/sample.txt` (or any PDF)
5. Wait for "Ready" status (usually 5-15 seconds)
6. Go to **Chat** tab and ask a question!

---

## Make Yourself Admin

After signing up, run this in the backend directory:

```bash
# Open SQLite shell
sqlite3 docuchat.db

# Make your user admin
UPDATE users SET is_admin = 1 WHERE email = 'your@email.com';
.quit
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | **Required.** Get free at console.groq.com |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | LLM model to use |
| `SECRET_KEY` | — | **Change this!** JWT signing secret |
| `CHUNK_SIZE` | `1000` | Characters per document chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between adjacent chunks |
| `TOP_K_RESULTS` | `5` | Documents retrieved per query |
| `SIMILARITY_THRESHOLD` | `0.3` | Min similarity to include a result |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload file size |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Get JWT tokens |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/documents/upload` | Upload files |
| GET | `/api/documents/` | List user's documents |
| DELETE | `/api/documents/{id}` | Delete document |
| POST | `/api/chat/stream` | Stream chat response (SSE) |
| GET | `/api/chat/sessions` | List chat sessions |
| GET | `/api/chat/sessions/{id}/messages` | Load session messages |
| DELETE | `/api/chat/sessions/{id}` | Delete session |
| GET | `/api/admin/stats` | Platform statistics (admin) |
| GET | `/api/admin/users` | All users (admin) |

---

## Deployment (Free)

### Option 1: Railway (Recommended — 1 click)

1. Push to GitHub
2. Connect at [railway.app](https://railway.app) (free tier available)
3. Add environment variables in Railway dashboard
4. Deploy backend and frontend as two services

### Option 2: Render

1. Push to GitHub
2. Create Web Service at [render.com](https://render.com)
3. Backend: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. Frontend: `npm run build && npm start`

### Option 3: Local Network Demo

```bash
# Share on your local network (for client demos)
uvicorn main:app --host 0.0.0.0 --port 8000   # Backend
npx next dev --hostname 0.0.0.0                 # Frontend
```

---

## Customization for Freelance Clients

### 1. Rebrand

Change the app name in:
- `backend/config.py` → `APP_NAME`
- `frontend/app/layout.tsx` → metadata title/description
- `frontend/components/Navbar.tsx` → brand text

### 2. Customize the AI Persona

Edit `backend/services/llm_service.py` → `SYSTEM_PROMPT`:

```python
SYSTEM_PROMPT = """You are [ClientName]'s AI assistant, specialized in [domain].
Answer questions using only the provided documents...."""
```

### 3. Add a New File Type

In `backend/services/document_processor.py`:

```python
def extract_text_from_csv(file_path: str) -> str:
    import pandas as pd
    df = pd.read_csv(file_path)
    return df.to_string()

extractors = {
    ".pdf": extract_text_from_pdf,
    ".csv": extract_text_from_csv,  # Add here
    ...
}
```

### 4. Swap to OpenAI (if client prefers)

In `backend/services/llm_service.py`, replace Groq with:

```python
from openai import AsyncOpenAI
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
# Same interface, just change the model name
```

---

## Troubleshooting

**"No text extracted from PDF"**
- Install `poppler-utils`: `sudo apt install poppler-utils`
- Install `tesseract`: `sudo apt install tesseract-ocr`

**"Embedding model downloading slowly"**
- First run downloads ~90MB model. Only happens once, cached after.

**"CORS error in browser"**
- Add your frontend URL to `CORS_ORIGINS` in `.env`

**"ChromaDB collection error"**
- Delete `backend/chroma_db/` folder and restart

**Streaming not working**
- Make sure you're not behind a proxy that buffers responses
- Add `X-Accel-Buffering: no` header (already included)

---

## License

MIT — Free to use, modify, and sell as part of your freelance projects.

---

Built with FastAPI, Next.js, ChromaDB, sentence-transformers, and Groq.
