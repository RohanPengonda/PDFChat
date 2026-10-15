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
import { vectorStore } from './src/server/vector';
import { SAFE_MESSAGES, safeErrorMessage } from './src/server/util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PDFs may carry a few bytes of whitespace/BOM before the header, so sniff a
// window rather than assuming the magic bytes are at offset 0.
function looksLikePdf(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(1024);
      const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
      return buf.subarray(0, bytesRead).includes('%PDF-');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

// Minimal in-memory fixed-window rate limiter (no external dependency).
// Suitable for a single-process deployment; use a shared store behind a proxy.
function rateLimit(options: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; reset: number }>();
  let lastSweep = Date.now();
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    // Opportunistically evict expired windows so the map cannot grow unbounded.
    if (now - lastSweep > options.windowMs) {
      for (const [key, entry] of hits) {
        if (entry.reset <= now) hits.delete(key);
      }
      lastSweep = now;
    }
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + options.windowMs });
      return next();
    }
    if (entry.count >= options.max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    entry.count++;
    next();
  };
}

// Expensive (Gemini-backed) endpoints get a shared budget per client.
const aiRateLimit = rateLimit({ windowMs: 60_000, max: 30 });

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
  const PORT = Number(process.env.PORT) || 3000;
  // Bind to loopback by default so the API is not exposed on the LAN. Set
  // HOST=0.0.0.0 explicitly when running in a container or testing from a phone.
  const HOST = process.env.HOST || '127.0.0.1';
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Token-based auth.
  //
  // Each token maps to a distinct tenant id so two callers can never read each
  // other's documents/chats. Configure one or more via:
  //   AUTH_TOKEN=<token>                  (single token, backwards compatible)
  //   AUTH_TOKENS=<token>:<userId>,...    (multiple distinct users)
  //
  // Identity is derived server-side from the token only. Any client-supplied
  // x-user-id header is ignored: trusting it would let a caller impersonate
  // another user and read/delete documents and chats they do not own.
  const authTokens = new Map<string, string>();
  const registerToken = (token: string, userId: string) => {
    if (token && userId && !authTokens.has(token)) authTokens.set(token, userId);
  };
  const deriveUserId = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex').slice(0, 24);
  // Backwards compatible single token: its tenant id is the hash of the token,
  // matching the id previously assigned so existing data stays reachable.
  if (process.env.AUTH_TOKEN) {
    registerToken(process.env.AUTH_TOKEN, deriveUserId(process.env.AUTH_TOKEN));
  }
  // Optional multi-user list: "token1:user1,token2:user2".
  for (const pair of (process.env.AUTH_TOKENS || '').split(',')) {
    const entry = pair.trim();
    if (!entry) continue;
    const sep = entry.indexOf(':');
    if (sep === -1) {
      console.warn(`Ignoring malformed AUTH_TOKENS entry (expected "token:userId"): ${entry}`);
      continue;
    }
    registerToken(entry.slice(0, sep).trim(), entry.slice(sep + 1).trim());
  }
  const authRequired = authTokens.size > 0;

  // Fail closed: a public deployment must not run without authentication.
  if (!authRequired && isProduction) {
    console.error('Error: authentication is required in production. Set AUTH_TOKEN or AUTH_TOKENS.');
    process.exit(1);
  }
  if (!authRequired) {
    console.warn('WARNING: no auth configured (AUTH_TOKEN/AUTH_TOKENS). All endpoints are public - do not expose this to the internet.');
  }

  const safeEqual = (a: string, b: string): boolean => {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
  };
  const extractToken = (req: express.Request): string => {
    const header = req.headers.authorization || '';
    return (header.replace(/^Bearer\s+/i, '') || (req.headers['x-api-token'] as string) || '').trim();
  };
  // Compare against every configured token (constant-time) so a valid token is
  // found without leaking which one matched.
  const resolveUserId = (token: string): string | undefined => {
    if (!token) return undefined;
    let matched: string | undefined;
    for (const [candidate, userId] of authTokens) {
      if (safeEqual(token, candidate)) matched = userId;
    }
    return matched;
  };

  // Public: lets the UI decide whether to show a login screen. Never requires a
  // valid token itself.
  app.get('/api/auth/status', (req, res) => {
    if (!authRequired) return res.json({ required: false, authenticated: true });
    res.json({ required: true, authenticated: resolveUserId(extractToken(req)) !== undefined });
  });

  // Only API routes require a token; the SPA shell and static assets stay
  // public so the login screen itself can load.
  app.use('/api', (req, res, next) => {
    if (!authRequired) {
      req.userId = undefined;
      return next();
    }
    const userId = resolveUserId(extractToken(req));
    if (userId !== undefined) {
      req.userId = userId;
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

      // The declared MIME type is client-controlled; verify the actual bytes.
      if (!looksLikePdf(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ error: 'Only PDF files are allowed' });
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
        // Distinguish a genuinely unknown chat from an empty one so the client
        // can recover from a stale localStorage chat id instead of silently
        // showing an empty conversation.
        if (!db.getChat(req.params.chatId, userId)) {
          return res.status(404).json({ error: 'Chat not found' });
        }
        const messages = await db.getMessages(req.params.chatId, userId);
        res.json(messages);
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
  });

  // 5. Send Message (Streaming)
  app.post('/api/chat', aiRateLimit, async (req, res) => {
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
      vectorStore.invalidate();
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
      vectorStore.invalidate();
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
    } catch {
      res.status(500).json({ error: 'Failed to update title' });
    }
  });

  // 10. Generate document summary
  app.post('/api/documents/:id/summary', aiRateLimit, async (req, res) => {
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

  // 11. Generate suggested questions.
  // Prefer POST /api/suggestions (supports all-documents mode); this per-document
  // variant is kept for backward compatibility.
  app.post('/api/documents/:id/suggestions', aiRateLimit, async (req, res) => {
    try {
      const { lastQuestion } = req.body;
      const userId = req.userId;
      const doc = db.getDocument(req.params.id, userId);
      if (!doc) return res.status(404).json({ error: 'Document not found or access denied' });
      const suggestions = await chatService.generateSuggestions(req.params.id, lastQuestion || '', userId);
      res.json({ suggestions });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  });

  // 11b. Generate suggested questions scoped to the selected document, or across
  // every document the caller owns when pdf_id is omitted.
  app.post('/api/suggestions', aiRateLimit, async (req, res) => {
    try {
      const { pdf_id, lastQuestion } = req.body;
      const userId = req.userId;
      if (pdf_id && !db.getDocument(pdf_id, userId)) {
        return res.status(404).json({ error: 'Document not found or access denied' });
      }
      const suggestions = await chatService.generateSuggestions(pdf_id || undefined, lastQuestion || '', userId);
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

  // Boot maintenance: re-embed chunks stored by an older embedding algorithm,
  // then remove upload files left behind by a crash or a manual DB reset.
  try {
    ingestionService.reindexIfNeeded();
    const knownFiles = new Set(db.getDocuments().map((d) => d.filename));
    for (const entry of fs.readdirSync(uploadDir)) {
      // Never touch dotfiles (e.g. .gitkeep).
      if (entry.startsWith('.')) continue;
      if (!knownFiles.has(entry)) {
        try { fs.unlinkSync(path.join(uploadDir, entry)); } catch {}
      }
    }
  } catch (error) {
    console.error('Boot maintenance failed:', error);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
