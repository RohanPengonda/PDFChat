# ChatPDF Pro

A fully-featured intelligent PDF chat application that lets you upload PDF documents and ask questions about them using AI. The app provides accurate answers with exact page references, document summaries, and a powerful chat interface.

---

## ✨ Features

- **📄 Multiple PDF Support** — Upload and manage multiple PDF documents
- **💬 Intelligent Chat** — Ask questions about your PDFs and get context-aware answers
- **📍 Source Citations** — Every answer includes exact page references
- **📋 Auto Summaries** — Get automatic summaries of your documents
- **🔍 PDF Viewer** — Built-in viewer with zoom and navigation controls
- **🤖 Multiple AI Models** — Choose between Gemini 2.5 Flash (fast) or Gemini 2.5 Pro (smarter)
- **🎨 Dark/Light Theme** — Switch between dark and light modes
- **📱 Responsive UI** — Works seamlessly on desktop and mobile
- **🔐 Vector Search** — AI-powered semantic search across documents

---

## Prerequisites

Before you start, make sure you have:

1. **Node.js** (v18 or higher)  
   Download from: https://nodejs.org (choose LTS version)

2. **Google Gemini API Key** (free tier available)  
   Get it from: https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"

---

## Installation & Setup

### 1. Clone and Navigate to Project

```bash
cd ChatPDF_Pro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Key

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Gemini API key.

---

## Running the Application

Start the development server:

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

---

## How to Use

### Uploading Documents

1. Click **Add Document** in the left sidebar
2. Drag and drop a PDF file, or click to browse and select one
3. Upload multiple PDFs to compare and cross-reference

### Asking Questions

1. Type your question in the chat box on the right
2. The AI analyzes all uploaded documents and provides an answer
3. Click on page references to jump directly to that section in the PDF viewer

### Document Summaries

1. After uploading a document, a summary automatically appears
2. Click the **📋 icon** next to any document name to view its summary anytime
3. Summaries highlight key topics and main points
4. Use **Copy** button to copy summary text to clipboard

### Managing Documents

- **Hover over document name** → click **✕** to delete individual documents
- Click **Clear All** to remove all documents at once

### PDF Viewer Controls

- **← Prev / Next →** — Navigate between pages
- **−** / **+** — Zoom in and out
- **Reset** — Return to normal zoom level

### AI Model Selection

- **Gemini 2.5 Flash** — Faster response times, good for simple questions
- **Gemini 2.5 Pro** — More intelligent analysis, better for complex queries

### Copy Answers

- Hover over any AI response and click the **copy icon** to add it to clipboard

### Theme Toggle

- Click the **☀️ sun icon** for light mode
- Click the **🌙 moon icon** for dark mode

---

## Customizing AI Behavior

All AI prompts and system instructions are stored in:

```
src/server/prompts.json
```

Open this file to customize:

- How the AI generates summaries
- How the AI answers questions
- The tone and style of responses
- Chat system instructions

No coding knowledge required — just edit the JSON file and restart the app.

---

## Project Structure

```
src/
├── components/           # React UI components
│   ├── ChatInterface.tsx # Chat messaging interface
│   ├── PDFViewer.tsx     # PDF display component
│   ├── SummaryModal.tsx  # Document summary modal
│   └── UploadZone.tsx    # File upload component
├── hooks/
│   └── useChat.ts        # Chat state and logic
├── lib/
│   └── api.ts            # API client utilities
├── server/               # Backend services
│   ├── chat.ts           # AI chat logic
│   ├── db.ts             # Database operations
│   ├── ingestion.ts      # PDF processing
│   ├── vector.ts         # Vector store/search
│   └── prompts.json      # AI prompt templates
├── App.tsx               # Main app component
├── main.tsx              # React entry point
└── index.css             # Global styles

server.ts               # Express backend entry point
vite.config.ts          # Vite configuration
tsconfig.json           # TypeScript configuration
```

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Express.js, Node.js
- **AI:** Google Gemini API
- **PDF Processing:** PDF.js, react-pdf
- **Database:** SQLite with better-sqlite3
- **Vector Search:** Custom vector embedding & storage
- **File Upload:** Multer
- **UI Components:** Lucide React icons

---

## Available Scripts

```bash
npm run dev        # Start development server (with Vite HMR)
npm run build      # Build for production
npm start          # Start server (production-like)
npm run lint       # Check TypeScript
npm run clean      # Remove build artifacts
```

---

## Troubleshooting

### API Key Issues

- Make sure your `.env` file is in the project root (not in a subfolder)
- Check that your API key is valid at https://aistudio.google.com/app/apikey
- Restart the server after updating your API key

### PDF Upload Issues

- Ensure PDFs are not corrupted and are valid PDF files
- Check file size limits (typically up to several MB per file)
- Try uploading a different PDF to test

### Port Already in Use

If port 3000 is in use, you'll need to either:

- Stop the process using port 3000
- Or modify the PORT in `server.ts` to a different port

### Missing Dependencies

If you get module not found errors:

```bash
npm install
```

---

## License

This project is provided as-is for personal and educational use.

**What you can change:**

| Field                    | What it controls                                            |
| ------------------------ | ----------------------------------------------------------- |
| `chat.systemInstruction` | How the AI answers questions — tone, citation style, length |
| `summary.systemRole`     | The AI's role when generating summaries                     |
| `summary.format`         | The exact structure and format of document summaries        |

**Example:** To make answers shorter, add this line inside `chat.systemInstruction`:

```
- Keep answers under 3 sentences.
```

**Example:** To change the summary format, edit the `summary.format` field to use your own headings and structure.

---

## Something not working?

**"GEMINI_API_KEY is missing"**
→ Make sure you created the `.env` file with your key, then restart the app.

**App is slow or not answering**
→ Your API key may have run out of free quota. Check at https://aistudio.google.com

**PDF not showing**
→ Use Chrome, Edge, or Firefox.

**Summary not loading**
→ Wait a few seconds after uploading — the summary takes a moment to generate.

---

## For production

Build the app:

```
npm run build
```

Start the server:

```
npm run start
```
