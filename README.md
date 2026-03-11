# Gemini RAG PDF Platform

A production-ready multi-PDF conversational AI platform using Gemini API, supporting RAG, vector search, and PDF highlighting.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A Google Gemini API Key

## Setup & Installation

1.  **Clone/Download the repository** and open it in VS Code.

2.  **Install Dependencies**:
    Open the VS Code terminal (`Ctrl+` `) and run:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    - Create a new file named `.env` in the root directory.
    - Add your Gemini API key:
      ```env
      GEMINI_API_KEY=your_actual_api_key_here
      ```

## Running the Application

1.  **Start the Development Server**:
    In the terminal, run:
    ```bash
    npm run dev
    ```

2.  **Open the App**:
    Open your browser and navigate to:
    [http://localhost:3000](http://localhost:3000)

## Features

- **Multi-PDF Upload**: Upload multiple PDF documents.
- **Chat Interface**: Ask questions about your documents.
- **Citations**: Answers include citations (File, Page).
- **Highlighting**: Click a citation to view the PDF page with the relevant text highlighted.
- **Local Database**: Uses SQLite for data persistence (no external DB setup required).

## Troubleshooting

- **"GEMINI_API_KEY is missing"**: Ensure you created the `.env` file correctly and restarted the server.
- **PDF rendering issues**: Ensure you are using a modern browser.
