# ChatPDF Q&A

Upload your PDF files and ask questions about them. The app reads your PDFs and gives you answers with exact page references!

---

## What you need before starting

You need 2 things on your computer:

**1. Node.js** — This runs the app.
Download it here: https://nodejs.org
(Pick the one that says "LTS")

**2. A Gemini API Key** — This lets the app use Google's AI for free.
Get it here: https://aistudio.google.com/app/apikey
(Sign in with Google → click "Create API Key")

---

## Setup (do this once)

**Step 1 — Download the project**
```
git clone https://github.com/RohanPengonda/PDFChat
cd PDFChat
```

**Step 2 — Install everything**
```
npm install
```

**Step 3 — Add your API key**

Create a file called `.env` in the project folder and paste this inside:
```
GEMINI_API_KEY=paste_your_key_here
```

---

## Start the app

```
npm run dev
```

Open your browser and go to: **http://localhost:3000**

---

## What you can do

**Upload PDFs**
- Click **Add Document** in the left sidebar
- Drag and drop a PDF file, or click to pick one
- You can upload multiple PDFs

**Ask questions**
- Type your question in the chat box on the right
- The app answers and shows exactly which page it found the answer on
- Click any source to jump to that page in the PDF

**Document Summary**
- After uploading, a summary automatically pops up showing what the document is about
- You can also click the 📋 icon next to any document name to see its summary anytime
- The summary shows key topics and main points
- Click **Copy** to copy the summary text

**PDF Viewer**
- Use **← Prev** and **Next →** buttons to flip pages
- Use **−** and **+** buttons to zoom in and out
- Click **Reset** to go back to normal zoom

**Choose AI Model**
- **Gemini 2.5 Flash** — faster answers
- **Gemini 2.5 Pro** — smarter answers

**Dark / Light Theme**
- Click the moon or sun icon in the sidebar to switch themes

**Copy Answers**
- Hover over any AI answer and click the copy icon to copy it

**Delete Documents**
- Hover over a document name → click the ✕ icon to delete it
- Click **Clear All** to remove all documents at once

---

## Customizing AI behavior

All the AI prompts are stored in one file:

```
src/server/prompts.json
```

You can open this file and change the text to control how the AI behaves — no coding needed.

**What you can change:**

| Field | What it controls |
|---|---|
| `chat.systemInstruction` | How the AI answers questions — tone, citation style, length |
| `summary.systemRole` | The AI's role when generating summaries |
| `summary.format` | The exact structure and format of document summaries |

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
