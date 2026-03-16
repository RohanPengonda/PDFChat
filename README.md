# ChatPDF Q&A (Gemini RAG PDF Platform)

A lightweight local PDF Q&A app that lets you upload one or more PDFs, ask questions, and get answers with citations and PDF text highlighting.

This project uses:

- **Google Gemini (Gemini API)** for generating responses
- **Local SQLite** for storing documents, chunks, and chat history
- **A local vector/keyword hybrid search** for retrieving relevant text
- **Server-side PDF parsing + client-side PDF viewer** for highlighting sources

---

## ✅ Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A **Google Gemini API Key** (set via `GEMINI_API_KEY`)

---

## 🚀 Setup & Installation

1. Clone or download the repository and open it in VS Code.

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

- Create a file named `.env` in the project root.
- Add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

> 🔎 Note: The project stores uploaded PDFs in `uploads/` and the local DB in `database.sqlite`.

---

## ▶️ Running the App (Development)

```bash
npm run dev
```

Then open:

- http://localhost:3000

---

## 🏁 Build + Production

Build UI assets:

```bash
npm run build
```

Start the server (serves the built UI + API):

```bash
npm run start
```

---

## ✨ Key Features

- **Multi-PDF Upload** (drag/drop or file picker)
- **Chat interface** with streaming responses
- **Model selector** (Gemini 2.5 Flash / Pro)
- **Citations** (file name + page number)
- **Click-to-highlight** in the PDF viewer
- **Persistent storage** via SQLite

---

## 🛠 Troubleshooting

- **"GEMINI_API_KEY is missing"**: Confirm `.env` exists and contains the key, then restart the server.
- **No responses / stream hangs**: Ensure your Gemini API key is valid and has enough quota.
- **PDF rendering issues**: Use a modern browser (Chrome/Edge/Firefox).

---

## 🗑️ Cleaning Up

- Clear all documents (from UI): use **Clear All** in the sidebar.
- Manually delete stored data (if needed):
  - `database.sqlite`
  - `uploads/` directory
