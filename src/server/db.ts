import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Initialize DB
const dbPath = path.resolve('database.sqlite');
const sqlite = new Database(dbPath);
try {
  sqlite.pragma('foreign_keys = ON');
  // Add indexes for common lookups
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
  `);
} catch (e) {
  // ignore index creation errors in case of existing schema
}

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    char_start_pos INTEGER DEFAULT 0,
    char_end_pos INTEGER DEFAULT 0,
    embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );
`);

export const db = {
  // Documents
  createDocument: (id: string, filename: string, originalName: string, userId?: string) => {
    const stmt = sqlite.prepare('INSERT INTO documents (id, filename, original_name, user_id) VALUES (?, ?, ?, ?)');
    stmt.run(id, filename, originalName, userId || null);
    return id;
  },

  getDocuments: (userId?: string) => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM documents WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC').all(userId);
    }
    return sqlite.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
  },

  getDocument: (id: string, userId?: string) => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM documents WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId);
    }
    return sqlite.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  },

  // Chunks
  createChunk: (id: string, documentId: string, content: string, pageNumber: number, chunkIndex: number, embedding: number[], charStartPos?: number, charEndPos?: number) => {
    const stmt = sqlite.prepare('INSERT INTO chunks (id, document_id, content, page_number, chunk_index, char_start_pos, char_end_pos, embedding) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, documentId, content, pageNumber, chunkIndex, charStartPos || 0, charEndPos || content.length, JSON.stringify(embedding));
  },

  getAllChunks: (documentId?: string) => {
    if (documentId) {
      const chunks = sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id WHERE c.document_id = ?').all(documentId);
      return chunks.map((c: any) => ({ ...c, embedding: JSON.parse(c.embedding) }));
    }
    const chunks = sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id').all();
    return chunks.map((c: any) => ({ ...c, embedding: JSON.parse(c.embedding) }));
  },

  // Chats
  createChat: (userId?: string) => {
    const id = uuidv4();
    const stmt = sqlite.prepare('INSERT INTO chats (id, title, user_id) VALUES (?, ?, ?)');
    stmt.run(id, 'New Chat', userId || null);
    return id;
  },

  getChat: (id: string, userId?: string) => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId);
    }
    return sqlite.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  },

  getChats: (userId?: string) => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM chats WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC').all(userId);
    }
    return sqlite.prepare('SELECT * FROM chats ORDER BY created_at DESC').all();
  },

  // Update chat title
  updateChatTitle: (id: string, title: string, userId?: string) => {
    if (userId) {
      sqlite.prepare('UPDATE chats SET title = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(title, id, userId);
      return;
    }
    sqlite.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, id);
  },

  // Messages
  addMessage: (chatId: string, role: 'user' | 'assistant', content: string) => {
    const id = uuidv4();
    const stmt = sqlite.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)');
    stmt.run(id, chatId, role, content);
    return id;
  },

  getMessages: (chatId: string, userId?: string) => {
    if (userId) {
      const chat = sqlite.prepare('SELECT id FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(chatId, userId);
      if (!chat) return [];
      return sqlite.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId);
    }
    return sqlite.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId);
  },

  // Delete document and its chunks
  deleteDocument: (id: string, userId?: string) => {
    if (userId) {
      const doc = sqlite.prepare('SELECT id FROM documents WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId);
      if (!doc) return 0;
    }
    sqlite.prepare('DELETE FROM chunks WHERE document_id = ?').run(id);
    const res = sqlite.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return res.changes;
  },

  // Clear all documents
  clearAllDocuments: (userId?: string) => {
    if (userId) {
      const docs = sqlite.prepare('SELECT id FROM documents WHERE user_id = ? OR user_id IS NULL').all(userId);
      const ids = (docs as any[]).map(d => d.id);
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        sqlite.prepare(`DELETE FROM chunks WHERE document_id IN (${placeholders})`).run(...ids);
      }
      sqlite.prepare('DELETE FROM documents WHERE user_id = ? OR user_id IS NULL').run(userId);
      return;
    }
    sqlite.prepare('DELETE FROM chunks').run();
    sqlite.prepare('DELETE FROM documents').run();
  }
};
