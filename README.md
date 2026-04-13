# ChatPDF Pro

A fully-featured intelligent PDF chat application that lets you upload PDF documents and ask questions about them using AI. The app provides accurate answers with exact page references, document summaries, and a powerful chat interface with semantic search capabilities.

## ✨ Features

- **📄 Multiple PDF Support** — Upload and manage multiple PDF documents simultaneously
- **💬 Intelligent Chat** — Ask context-aware questions about your PDFs and get AI-powered answers
- **📍 Source Citations** — Every answer includes exact page references for verification
- **📋 Auto Summaries** — Automatic document summaries with one click
- **🔍 PDF Viewer** — Built-in viewer with zoom, navigation, and page controls
- **🤖 Multiple AI Models** — Choose between Gemini 2.5 Flash (fast) or Gemini 2.5 Pro (advanced)
- **🎨 Dark/Light Theme** — Seamlessly toggle between dark and light modes
- **📱 Responsive UI** — Optimized for desktop and mobile devices
- **🔐 Vector Search** — AI-powered semantic search with hybrid matching across documents

## Prerequisites

Before you start, make sure you have:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org (choose the LTS version)
   - Verify installation: `node --version`

2. **Google Gemini API Key** (free tier available)
   - Get it from: https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key" and copy the key

## Installation & Setup

### 1. Navigate to Project Directory

```bash
cd ChatPDF_Pro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Key

Create a `.env` file in the project root with your Gemini API key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

**Important:** Replace `your_actual_api_key_here` with your actual Gemini API key from step 2.

## Running the Application

Start the development server with hot module reloading:

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

The server will automatically reload when you make changes to the code.

## How to Use

### 📤 Uploading Documents

1. Click **Add Document** button in the left sidebar
2. Drag and drop a PDF file, or click to browse and select one
3. Wait for the upload to complete and the summary to generate
4. Upload multiple PDFs to compare and cross-reference information

### 💬 Asking Questions

1. Type your question in the chat box on the right side of the screen
2. Press Enter or click the Send button
3. The AI analyzes all uploaded documents and streams a response
4. Click on page references (e.g., [1], [2]) to jump directly to that section in the PDF viewer

### 📋 Viewing Document Summaries

1. After uploading a document, a summary automatically generates
2. Click the **📋 icon** next to the document name to view the summary anytime
3. Summaries highlight key topics and main points
4. Use the **Copy** button within the summary to copy text to clipboard

### 🗂️ Managing Documents

- **Delete a Document:** Hover over the document name and click the **✕** button
- **Clear All Documents:** Click **Clear All** to remove all uploaded documents at once
- **Select Active Document:** Click on any document name to make it the active document in the PDF viewer

### 🔍 PDF Viewer Controls

- **Navigate Pages:** Use **← Prev** and **Next →** buttons to move between pages
- **Page Jump:** Click on the page indicator to jump to a specific page
- **Zoom Controls:** Use **−** to zoom out and **+** to zoom in
- **Reset View:** Click **Reset** to return to the default zoom level
- **Page Counter:** Shows your current page position in the document

### 🤖 AI Model Selection

Choose the AI model that best fits your needs:

- **Gemini 2.5 Flash** — Faster response times, suitable for straightforward questions
- **Gemini 2.5 Pro** — More advanced analysis, ideal for complex queries and detailed insights

Model selection appears in the chat interface and affects response times and accuracy.

### 📋 Copying Answers

- Hover over any AI-generated response in the chat
- Click the **copy icon** to add the response to your clipboard
- A confirmation message will appear briefly

### 🌓 Theme Toggle

- Click the **☀️ sun icon** for light mode
- Click the **🌙 moon icon** for dark mode
- Theme preference is maintained during your session

## Customizing AI Behavior

All AI prompts and system instructions are stored in [src/server/prompts.json](src/server/prompts.json).

Open this file to customize:

- **How the AI generates summaries** — Change summary tone, length, and format
- **How the AI answers questions** — Modify response style, citation format, and answer structure
- **Tone and style of responses** — Make answers more formal, casual, detailed, or concise
- **Chat system instructions** — Define the AI's persona and behavior guidelines

No coding knowledge required — just edit the JSON file and restart the server to apply changes.

### Example Customizations

**To make answers shorter:**

```json
"chat.systemInstruction": "Keep answers under 3 sentences..."
```

**To change summary format:**

```json
"summary.format": "Use custom headings and structure..."
```

## Project Structure

```
ChatPDF_Pro/
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx    # Chat messaging UI and message display
│   │   ├── PDFViewer.tsx        # PDF viewing with navigation and zoom
│   │   ├── SummaryModal.tsx     # Document summary modal component
│   │   └── UploadZone.tsx       # Drag-and-drop file upload area
│   ├── hooks/
│   │   └── useChat.ts           # Chat state management and logic
│   ├── lib/
│   │   └── api.ts               # API client utility functions
│   ├── server/
│   │   ├── chat.ts              # AI chat logic and response generation
│   │   ├── db.ts                # SQLite database operations
│   │   ├── ingestion.ts         # PDF processing and chunking
│   │   ├── vector.ts            # Vector embeddings and semantic search
│   │   └── prompts.json         # AI prompt templates and instructions
│   ├── App.tsx                  # Main application component
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Global styles and Tailwind imports
│   └── vite-env.d.ts            # TypeScript environment definitions
├── uploads/                     # Storage for uploaded PDF files
├── server.ts                    # Express backend entry point
├── vite.config.ts               # Vite bundler configuration
├── tsconfig.json                # TypeScript compiler options
├── package.json                 # Project dependencies and scripts
├── index.html                   # HTML entry point
└── README.md                    # This file
```

## Technology Stack

### Frontend

- **React 19** — UI library with latest features
- **TypeScript** — Type-safe JavaScript development
- **Vite** — Lightning-fast module bundler
- **Tailwind CSS** — Utility-first CSS framework
- **Lucide React** — Icon library with 546+ icons
- **React PDF** — PDF viewing and rendering
- **React Markdown** — Markdown rendering in chat

### Backend

- **Node.js** — JavaScript runtime
- **Express.js** — Web application framework
- **Multer** — File upload handling
- **CORS** — Cross-origin resource sharing

### AI & Search

- **Google Gemini API** — AI model for chat and summaries (2.5 Flash & 2.5 Pro)
- **Vector Embeddings** — Semantic search capabilities
- **Custom Vector Store** — Local vector database

### Database & Storage

- **SQLite** — Lightweight database
- **better-sqlite3** — Fast SQLite driver for Node.js
- **Uploads Directory** — Local PDF file storage

## Available Scripts

```bash
npm run dev        # Start development server with hot module reloading
npm run build      # Compile project for production
npm start          # Start server in production mode
npm run lint       # Run TypeScript type checking
npm run clean      # Remove build artifacts from dist/
```

### Development Workflow

For development, use:

```bash
npm run dev
```

This starts the Express server with live reloading and provides HMR (Hot Module Replacement) for instant code updates.

## Troubleshooting

### 🔑 API Key Issues

**Problem:** "GEMINI_API_KEY is missing" or API errors

**Solutions:**

- Verify `.env` file exists in the project root (not in a subfolder)
- Check the API key is valid: https://aistudio.google.com/app/apikey
- Make sure the `.env` file contains exactly: `GEMINI_API_KEY=your_key_here`
- Restart the development server after creating/updating `.env`
- Ensure your API key has available quota

### 📄 PDF Upload Issues

**Problem:** Unable to upload PDF or "Failed to process document"

**Solutions:**

- Verify the PDF file is not corrupted (try opening it in a PDF reader first)
- Ensure the file is a valid PDF format
- Check file size (typically up to several MB per file)
- Try uploading a different PDF to identify if it's file-specific
- Check browser console (F12) for detailed error messages

### 🔌 Port Already in Use

**Problem:** "Error: listen EADDRINUSE :::3000"

**Solutions:**

- Stop the process currently using port 3000
- On Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
- On macOS/Linux: `lsof -i :3000` then `kill -9 <PID>`
- Or modify the PORT in `server.ts` to a different port

### 📦 Missing Dependencies

**Problem:** "Cannot find module" or "Module not found" errors

**Solution:**

```bash
npm install
```

Then restart the development server.

### 🚀 App is Slow or Not Responding

**Problem:** Long response times or no answers from AI

**Solutions:**

- Check your Gemini API quota: https://aistudio.google.com
- Free tier has rate limits — consider upgrading for faster responses
- Verify internet connection
- Check server logs for errors (console output)
- Try a simpler question first

### 📖 PDF Not Displaying

**Problem:** PDF viewer shows blank or only partial content

**Solutions:**

- Try using Chrome, Edge, or Firefox (Safari has limited PDF.js support)
- Refresh the page (Ctrl+R or Cmd+R)
- Try uploading and selecting a different PDF
- Check browser console for JavaScript errors

### ⏳ Summary Not Loading

**Problem:** Document summary takes too long or doesn't appear

**Solutions:**

- Wait 5-10 seconds after uploading — summaries take time to generate
- Check API quota hasn't been exceeded
- Verify the PDF is not extremely large (1000+ pages)
- Try uploading a smaller PDF first

### 🎨 Styling Issues or UI Not Displaying Correctly

**Problem:** Layout looks broken, colors wrong, or components missing

**Solutions:**

- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check that Tailwind CSS builds properly: `npm run build`
- Verify you're using a modern browser (Chrome, Firefox, Edge, Safari latest)

### ❓ Still Having Issues?

If problems persist:

1. Check the browser console (F12) for error messages
2. Check the server terminal for backend errors
3. Ensure all dependencies are installed: `npm install`
4. Try restarting the development server: Ctrl+C then `npm run dev`

## 🚀 Deployment & Production

### Building for Production

Compile and optimize the project:

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Running in Production

Start the production server:

```bash
npm start
```

This runs the Express server in production mode and serves the built frontend.

### Deployment Considerations

- Set environment variables securely (don't commit `.env` files)
- Ensure `GEMINI_API_KEY` is set as an environment variable on your server
- Consider deploying to platforms like:
  - Vercel (Next.js compatible)
  - Heroku
  - Railway
  - AWS, Google Cloud, Azure

## License

This project is provided as-is for personal and educational use.

## Contributing

Feel free to fork, modify, and improve this project for your needs. If you have suggestions or improvements, consider sharing them back!

---

**Last Updated:** April 2026
