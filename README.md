# ChatPDF Pro

Upload your PDFs and ask questions about them. Get answers with exact source citations and highlighted text in the PDF viewer — powered by Google Gemini.

---

## What it does

- Upload one or more PDF files
- Ask questions in a chat interface
- Get answers with page citations and highlighted text in the PDF
- Choose between Gemini 2.5 Flash (faster) or Gemini 2.5 Pro (smarter)

---

## Before you start

You need two things installed on your computer:

1. **Node.js v18 or higher** — download from https://nodejs.org
2. **A Google Gemini API key** — get one free from https://aistudio.google.com/app/apikey

---

## Setup (do this once)

**1. Download the project**

```bash
git clone <your-repo-url>
cd ChatPDF_Pro
```

**2. Install dependencies**

```bash
npm install
```

**3. Add your API key**

Create a file called `.env` in the project root and paste this inside:

```
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Gemini API key.

---

## Running the app

```bash
npm run dev
```

Then open your browser and go to: **http://localhost:3000**

---

## How to use it

1. Click **Upload** or drag and drop a PDF into the sidebar
2. Wait for it to finish processing
3. Type your question in the chat box and hit send
4. Click any source citation to jump to and highlight that text in the PDF

---

## Common issues

**"GEMINI_API_KEY is missing"**
Make sure your `.env` file exists in the project root and has the correct key. Restart the server after creating it.

**No answer / response hangs**
Your API key may be invalid or out of quota. Check it at https://aistudio.google.com

**PDF not displaying**
Use a modern browser — Chrome, Edge, or Firefox.

---

## For production deployment

Build the frontend:

```bash
npm run build
```

Start the server:

```bash
npm run start
```
