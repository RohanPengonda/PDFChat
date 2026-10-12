import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { db } from './src/server/db';
import { ingestionService } from './src/server/ingestion';
import { chatService } from './src/server/chat';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Messages we intentionally surface to the client (user-caused failures).
// Anything else is logged server-side and returned as a generic error so
// internal details (paths, stack traces) never leak to the browser.
const SAFE_MESSAGES = new Set([
  'Only PDF files are allowed',
  'No extractable text found in this PDF (it may be a scanned image).',
  'No content found in this document.',
  'Failed to generate summary',
]);

function safeErrorMessage(message: unknown): string {
  return typeof message === 'string' && SAFE_MESSAGES.has(message)
    ? message
    : 'Failed to process document.';
}
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

async function startServer() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is required. Set it in .env');
    process.exit(1);
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple auth middleware (optional token-based). If AUTH_TOKEN not set, allow all (dev-only).
  //
  // Identity is derived server-side from the token only. Any client-supplied
  // x-user-id header is ignored: trusting it let a caller impersonate another
  // user and read/delete documents and chats they do not own.
  const AUTH_TOKEN = process.env.AUTH_TOKEN;
  const authRequired = !!AUTH_TOKEN;
  const safeEqual = (a: string, b: string): boolean => {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
  };
  app.use((req, res, next) => {
    if (!authRequired) {
      req.userId = undefined;
      return next();
    }
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '') || (req.headers['x-api-token'] as string);
    if (token && AUTH_TOKEN && safeEqual(token, AUTH_TOKEN)) {
      // One shared token maps to one tenant; identities cannot be spoofed per request.
      req.userId = crypto.createHash('sha256').update(AUTH_TOKEN).digest('hex').slice(0, 24);
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  });
  // API Routes
  
  // 1. Upload PDF
  const pdfFilter = (_req: any, file: any, cb: any) => {
    if (!file.mimetype || file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  };
  const uploadSafe = multer({ dest: uploadDir, fileFilter: pdfFilter, limits: { fileSize: 50 * 1024 * 1024 } });
  app.post('/api/upload', uploadSafe.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const userId = req.userId;
      const documentId = await ingestionService.processDocument(req.file, userId);
      // Match the shape returned by GET /api/documents so the client can render
      // the document immediately without waiting for a refetch.
      res.json({ id: documentId, filename: req.file.filename, original_name: req.file.originalname });
    } catch (error: any) {
      console.error('Upload error:', error);
      const isClientFault =
        typeof error?.message === 'string' && SAFE_MESSAGES.has(error.message);
      res.status(isClientFault ? 400 : 500).json({ error: safeErrorMessage(error?.message) });
    }
  });

  // 2. List Documents
  app.get('/api/documents', async (req, res) => {
    try {
      const userId = req.userId;
      const docs = await db.getDocuments(userId);
      res.json(docs);
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  // 3. Create Chat
  app.post('/api/chats', async (req, res) => {
    try {
      const userId = req.userId;
      const chatId = await db.createChat(userId);
      res.json({ id: chatId });
    } catch (error) {
      console.error('Create chat error:', error);
      res.status(500).json({ error: 'Failed to create chat' });
    }
  });
  
  // 4. Get Chat History
  app.get('/api/chats/:chatId', async (req, res) => {
    try {
        const userId = req.userId;
        const messages = await db.getMessages(req.params.chatId, userId);
        res.json(messages);
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
  });

  // 5. Send Message (Streaming)
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, chatId, mode, pdf_id, model } = req.body;

      if (
        typeof message !== 'string' ||
        !message.trim() ||
        typeof chatId !== 'string' ||
        !chatId ||
        (mode !== 'single' && mode !== 'all')
      ) {
        return res.status(400).json({ error: 'message, chatId, and a valid mode are required' });
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Keep the connection alive through long model delays so proxies that
      // terminate idle streams don't drop the response mid-generation.
      const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(`: keep-alive\n\n`);
      }, 30000);
      const stopHeartbeat = () => clearInterval(heartbeat);
      res.once('close', stopHeartbeat);
      res.once('finish', stopHeartbeat);

      const userId = req.userId;
      try {
        await chatService.generateResponse(message, chatId, mode, pdf_id, res, model, userId);
      } finally {
        stopHeartbeat();
      }
      
      // End response is handled in generateResponse or here if it returns
    } catch (error) {
      console.error('Chat error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate response' });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        res.end();
      }
    }
  });
  
  // 6. Serve PDF file content
  app.get('/api/documents/:id/content', async (req, res) => {
      try {
          const userId = req.userId;
          const doc = db.getDocument(req.params.id, userId);
          if (!doc) {
              return res.status(404).json({ error: 'Document not found or access denied' });
          }
          const filePath = path.join(uploadDir, doc.filename);
          if (!fs.existsSync(filePath)) {
               return res.status(404).json({ error: 'File not found on disk' });
          }
          // Uploads are stored without an extension, so sendFile would otherwise
          // serve them as application/octet-stream. Force the PDF type explicitly.
          res.type('application/pdf');
          res.sendFile(filePath);
      } catch (error) {
          console.error('Serve PDF error:', error);
          res.status(500).json({ error: 'Failed to serve PDF' });
      }
  });

  // 7. Delete document
  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const userId = req.userId;
      const doc = db.getDocument(req.params.id, userId);
      if (doc) {
        const filePath = path.join(uploadDir, doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      db.deleteDocument(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // 8. Clear all documents
  app.delete('/api/documents', async (req, res) => {
    try {
      const userId = req.userId;
      // Only remove files that belong to the caller's documents. Wiping the
      // whole uploads/ directory would delete other users' PDFs while leaving
      // their DB rows intact.
      const docs = db.getDocuments(userId);
      docs.forEach(doc => {
        if (!doc.filename) return;
        const filePath = path.join(uploadDir, path.basename(doc.filename));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      db.clearAllDocuments(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Clear documents error:', error);
      res.status(500).json({ error: 'Failed to clear documents' });
    }
  });

  // 9. Update chat title
  app.patch('/api/chats/:id/title', async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: 'Title required' });
      const userId = req.userId;
      db.updateChatTitle(req.params.id, title, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update title' });
    }
  });

  // 10. Generate document summary
  app.post('/api/documents/:id/summary', async (req, res) => {
    try {
      const userId = req.userId;
      const doc = db.getDocument(req.params.id, userId);
      if (!doc) return res.status(404).json({ error: 'Document not found or access denied' });
      // Ignore previously cached failure placeholders so they can be regenerated.
      const cachedSummary = doc.summary;
      const isFailurePlaceholder = !cachedSummary || cachedSummary === 'Could not generate summary.';
      if (!isFailurePlaceholder) return res.json({ summary: cachedSummary });
      const summary = await chatService.generateSummary(req.params.id);
      db.setDocumentSummary(req.params.id, summary);
      res.json({ summary });
    } catch (error) {
      console.error('Summary error:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  });

  // 11. Generate suggested questions
  app.post('/api/documents/:id/suggestions', async (req, res) => {
    try {
      const { lastQuestion } = req.body;
      const userId = req.userId;
      const doc = db.getDocument(req.params.id, userId);
      if (!doc) return res.status(404).json({ error: 'Document not found or access denied' });
      const suggestions = await chatService.generateSuggestions(req.params.id, lastQuestion || '');
      res.json({ suggestions });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  });

  // Central error handler: converts Multer / file-filter / ingestion failures
  // into JSON responses without leaking internal details.
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum size is 50MB.'
        : 'Upload failed.';
      console.error('Upload rejected:', err.code, err.message);
      return res.status(400).json({ error: msg });
    }
    if (typeof err?.message === 'string' && SAFE_MESSAGES.has(err.message)) {
      console.error('Upload rejected:', err.message);
      return res.status(400).json({ error: err.message });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  // Serve the built SPA in production; use Vite middleware in development.
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
  if (isProduction) {
    const distPath = path.join(__dirname, 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      console.error('Error: dist/index.html not found. Run `npm run build` first.');
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
