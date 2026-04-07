import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

// Services - these will be created shortly
// We use dynamic imports or require inside the route handlers if we want to be safe, 
// but for this file structure, we will create them next.
// For now, I will comment out the imports and usage until the files exist to avoid compilation errors if run immediately,
// but since I am creating them in the next steps, I will keep them and ensure I create the files before running.

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
  app.use(cors());

  // API Routes
  
  // 1. Upload PDF
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const documentId = await ingestionService.processDocument(req.file);
      res.json({ id: documentId, filename: req.file.originalname });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  // 2. List Documents
  app.get('/api/documents', async (req, res) => {
    try {
      const docs = await db.getDocuments();
      res.json(docs);
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  // 3. Create Chat
  app.post('/api/chats', async (req, res) => {
    try {
      const chatId = await db.createChat();
      res.json({ id: chatId });
    } catch (error) {
      console.error('Create chat error:', error);
      res.status(500).json({ error: 'Failed to create chat' });
    }
  });
  
  // 4. Get Chat History
  app.get('/api/chats/:chatId', async (req, res) => {
    try {
        const messages = await db.getMessages(req.params.chatId);
        res.json(messages);
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
  });

  // 5. Send Message (Streaming)
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, chatId, documentIds, model } = req.body;
      
      if (!message || !chatId) {
        return res.status(400).json({ error: 'Message and chatId are required' });
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await chatService.generateResponse(message, chatId, documentIds, res, model);
      
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
          const doc = await db.getDocument(req.params.id) as { filename: string } | undefined;
          if (!doc) {
              return res.status(404).json({ error: 'Document not found' });
          }
          const filePath = path.join(uploadDir, doc.filename); // filename is the stored filename (uuid)
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
      const doc = await db.getDocument(req.params.id) as { filename: string } | undefined;
      if (doc) {
        const filePath = path.join(uploadDir, doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      db.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // 8. Clear all documents
  app.delete('/api/documents', async (req, res) => {
    try {
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      db.clearAllDocuments();
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
      db.updateChatTitle(req.params.id, title);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update title' });
    }
  });

  // 10. Generate document summary
  app.post('/api/documents/:id/summary', async (req, res) => {
    try {
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
