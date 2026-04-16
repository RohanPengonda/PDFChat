import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Initialize DB
const dbPath = path.resolve('database.sqlite');
const sqlite = new Database(dbPath);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
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
    FOREIGN KEY(document_id) REFERENCES documents(id)
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id)
  );
`);

export const db = {
  // Documents
  createDocument: (id: string, filename: string, originalName: string) => {
    const stmt = sqlite.prepare('INSERT INTO documents (id, filename, original_name) VALUES (?, ?, ?)');
    stmt.run(id, filename, originalName);
    return id;
  },

  getDocuments: () => {
    return sqlite.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
  },

  getDocument: (id: string) => {
    return sqlite.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  },

  // Chunks
  createChunk: (id: string, documentId: string, content: string, pageNumber: number, chunkIndex: number, embedding: number[], charStartPos?: number, charEndPos?: number) => {
    const stmt = sqlite.prepare('INSERT INTO chunks (id, document_id, content, page_number, chunk_index, char_start_pos, char_end_pos, embedding) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, documentId, content, pageNumber, chunkIndex, charStartPos || 0, charEndPos || content.length, JSON.stringify(embedding));
  },

  getAllChunks: () => {
    const chunks = sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id').all();
    return chunks.map((c: any) => ({ ...c, embedding: JSON.parse(c.embedding) }));
  },

  // Chats
  createChat: () => {
    const id = uuidv4();
    const stmt = sqlite.prepare('INSERT INTO chats (id, title) VALUES (?, ?)');
    stmt.run(id, 'New Chat');
    return id;
  },

  // Update chat title
  updateChatTitle: (id: string, title: string) => {
    sqlite.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, id);
  },

  // Messages
  addMessage: (chatId: string, role: 'user' | 'assistant', content: string) => {
    const id = uuidv4();
    const stmt = sqlite.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)');
    stmt.run(id, chatId, role, content);
    return id;
  },

  getMessages: (chatId: string) => {
    return sqlite.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId);
  },

  // Delete document and its chunks
  deleteDocument: (id: string) => {
    sqlite.prepare('DELETE FROM chunks WHERE document_id = ?').run(id);
    sqlite.prepare('DELETE FROM documents WHERE id = ?').run(id);
  },

  // Clear all documents
  clearAllDocuments: () => {
    sqlite.prepare('DELETE FROM chunks').run();
    sqlite.prepare('DELETE FROM documents').run();
  }
};
