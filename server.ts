import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { db } from './src/server/db';
import { ingestionService } from './src/server/ingestion';
import { chatService } from './src/server/chat';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: uploadDir });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple auth middleware (optional token-based). If AUTH_TOKEN not set, allow all (dev-only).
  const AUTH_TOKEN = process.env.AUTH_TOKEN;
  const authRequired = !!AUTH_TOKEN;
  app.use((req, res, next) => {
    if (!authRequired) {
      (req as any).userId = req.headers['x-user-id'] as string | undefined;
      return next();
    }
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '') || (req.headers['x-api-token'] as string);
    if (token === AUTH_TOKEN) {
      (req as any).userId = req.headers['x-user-id'] as string | undefined;
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  });
  // API Routes
  
  // 1. Upload PDF
  const pdfFilter = (req: any, file: any, cb: any) => {
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
      
      const userId = (req as any).userId;
      const documentId = await ingestionService.processDocument(req.file, userId);
      res.json({ id: documentId, filename: req.file.originalname });
    } catch (error: any) {
      console.error('Upload error:', error);
      const msg = error?.message || 'Failed to process document';
      res.status(500).json({ error: msg });
    }
  });

  // 2. List Documents
  app.get('/api/documents', async (req, res) => {
    try {
      const userId = (req as any).userId;
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
      const userId = (req as any).userId;
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
        const userId = (req as any).userId;
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
      
      if (!message || !chatId || !mode) {
        return res.status(400).json({ error: 'Message, chatId, and mode are required' });
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const userId = (req as any).userId;
      await chatService.generateResponse(message, chatId, mode, pdf_id, res, model, userId);
      
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
          const userId = (req as any).userId;
          const doc = await db.getDocument(req.params.id, userId) as { filename: string } | undefined;
          if (!doc) {
              return res.status(404).json({ error: 'Document not found or access denied' });
          }
          const filePath = path.join(uploadDir, doc.filename);
          if (!fs.existsSync(filePath)) {
               return res.status(404).json({ error: 'File not found on disk' });
          }
          res.sendFile(filePath);
      } catch (error) {
          console.error('Serve PDF error:', error);
          res.status(500).json({ error: 'Failed to serve PDF' });
      }
  });

  // 7. Delete document
  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const doc = await db.getDocument(req.params.id, userId) as { filename: string } | undefined;
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
      const userId = (req as any).userId;
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
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
      const userId = (req as any).userId;
      db.updateChatTitle(req.params.id, title, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update title' });
    }
  });

  // 10. Generate document summary
  app.post('/api/documents/:id/summary', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const doc = await db.getDocument(req.params.id, userId);
      if (!doc) return res.status(404).json({ error: 'Document not found or access denied' });
      const summary = await chatService.generateSummary(req.params.id);
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
      const userId = (req as any).userId;
      const doc = await db.getDocument(req.params.id, userId);
      if (!doc) return res.status(404).json({ error: 'Document not found or access denied' });
      const suggestions = await chatService.generateSuggestions(req.params.id, lastQuestion || '');
      res.json({ suggestions });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  });

  // Vite middleware for development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
