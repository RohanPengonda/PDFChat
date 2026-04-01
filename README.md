# ChatPDF Q&A

This app lets you upload a PDF file and ask questions about it. The app reads your PDF and gives you answers!

---

## What you need before starting

You need to install 2 things on your computer:

**1. Node.js** — This runs the app.
Download it here: https://nodejs.org
(Pick the one that says "LTS")

**2. A Gemini API Key** — This is like a password that lets the app use Google's AI.
Get it free here: https://aistudio.google.com/app/apikey
(Sign in with your Google account and click "Create API Key")

---

## How to set it up (only do this once)

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

Create a new file called `.env` in the project folder.
Open it and paste this inside:

```
GEMINI_API_KEY=paste_your_key_here
```

Replace `paste_your_key_here` with the key you got from Google.

---

## How to start the app

```
npm run dev
```

Then open your browser and go to:
**http://localhost:3000**

---

## How to use it

1. Click **Add Document** and pick a PDF from your computer
2. Wait a few seconds for it to load
3. Type your question in the box at the bottom right
4. The app will answer and show you exactly where in the PDF it found the answer
5. Click on a source to jump to that page in the PDF

---

## Something not working?

**"GEMINI_API_KEY is missing"**
→ Make sure you created the `.env` file and added your key. Then stop and restart the app.

**App is not answering**
→ Your API key might be wrong. Double check it at https://aistudio.google.com

**PDF not showing**
→ Use Chrome, Edge, or Firefox. Very old browsers may not work.
