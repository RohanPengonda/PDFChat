import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface Source {
  file_name: string;
  pdf_id: string;
  page_number: number;
  text: string;
  confidence: number;
}

export interface DocumentRow {
  id: string;
  filename: string;
  original_name: string;
  user_id: string | null;
  summary: string | null;
  created_at: string;
}

export interface ChunkRow {
  id: string;
  document_id: string;
  content: string;
  page_number: number;
  chunk_index: number;
  char_start_pos: number;
  char_end_pos: number;
  embedding: number[];
  created_at: string;
  file_name: string;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  created_at: string;
}

interface RawChunkRow extends Omit<ChunkRow, 'embedding'> {
  embedding: string | null;
}

interface RawMessageRow extends Omit<MessageRow, 'sources'> {
  sources: string | null;
}

// Initialize DB
const dbPath = path.resolve('database.sqlite');
const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    user_id TEXT,
    summary TEXT,
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
    sources TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );
`);

// Migrate databases created before a column existed (CREATE TABLE IF NOT EXISTS
// never alters an existing table).
const ensureColumn = (table: string, column: string, ddl: string) => {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
};
ensureColumn('documents', 'user_id', 'TEXT');
ensureColumn('documents', 'summary', 'TEXT');
ensureColumn('chats', 'user_id', 'TEXT');
ensureColumn('messages', 'sources', 'TEXT');

// Indexes must be created after tables (and migrated columns) exist
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
  CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
  CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
`);

export const db = {
  // Documents
  createDocument: (id: string, filename: string, originalName: string, userId?: string): string => {
    const stmt = sqlite.prepare('INSERT INTO documents (id, filename, original_name, user_id) VALUES (?, ?, ?, ?)');
    stmt.run(id, filename, originalName, userId || null);
    return id;
  },

  getDocuments: (userId?: string): DocumentRow[] => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM documents WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC').all(userId) as DocumentRow[];
    }
    return sqlite.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentRow[];
  },

  getDocument: (id: string, userId?: string): DocumentRow | undefined => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM documents WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId) as DocumentRow | undefined;
    }
    return sqlite.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined;
  },

  setDocumentSummary: (id: string, summary: string): void => {
    sqlite.prepare('UPDATE documents SET summary = ? WHERE id = ?').run(summary, id);
  },

  // Chunks
  createChunk: (id: string, documentId: string, content: string, pageNumber: number, chunkIndex: number, embedding: number[], charStartPos?: number, charEndPos?: number): void => {
    const stmt = sqlite.prepare('INSERT INTO chunks (id, document_id, content, page_number, chunk_index, char_start_pos, char_end_pos, embedding) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, documentId, content, pageNumber, chunkIndex, charStartPos ?? 0, charEndPos ?? content.length, JSON.stringify(embedding));
  },

  getAllChunks: (documentId?: string): ChunkRow[] => {
    const rows = (documentId
      ? sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id WHERE c.document_id = ?').all(documentId)
      : sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id').all()) as RawChunkRow[];
    return rows.map((c) => ({ ...c, embedding: c.embedding ? (JSON.parse(c.embedding) as number[]) : [] }));
  },

  // Chats
  createChat: (userId?: string): string => {
    const id = uuidv4();
    const stmt = sqlite.prepare('INSERT INTO chats (id, title, user_id) VALUES (?, ?, ?)');
    stmt.run(id, 'New Chat', userId || null);
    return id;
  },

  getChat: (id: string, userId?: string): { id: string; title: string | null } | undefined => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId) as { id: string; title: string | null } | undefined;
    }
    return sqlite.prepare('SELECT * FROM chats WHERE id = ?').get(id) as { id: string; title: string | null } | undefined;
  },

  // Update chat title
  updateChatTitle: (id: string, title: string, userId?: string): void => {
    if (userId) {
      sqlite.prepare('UPDATE chats SET title = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(title, id, userId);
      return;
    }
    sqlite.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, id);
  },

  // Messages
  addMessage: (chatId: string, role: 'user' | 'assistant', content: string, sources?: Source[]): string => {
    const id = uuidv4();
    const stmt = sqlite.prepare('INSERT INTO messages (id, chat_id, role, content, sources) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, chatId, role, content, sources && sources.length ? JSON.stringify(sources) : null);
    return id;
  },

  getMessages: (chatId: string, userId?: string): MessageRow[] => {
    let rows: RawMessageRow[];
    if (userId) {
      const chat = sqlite.prepare('SELECT id FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(chatId, userId);
      if (!chat) return [];
      rows = sqlite.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC, rowid ASC').all(chatId) as RawMessageRow[];
    } else {
      rows = sqlite.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC, rowid ASC').all(chatId) as RawMessageRow[];
    }
    return rows.map((r) => ({
      ...r,
      sources: r.sources ? (JSON.parse(r.sources) as Source[]) : undefined,
    }));
  },

  // Delete document and its chunks
  deleteDocument: (id: string, userId?: string): number => {
    if (userId) {
      const doc = sqlite.prepare('SELECT id FROM documents WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId);
      if (!doc) return 0;
    }
    sqlite.prepare('DELETE FROM chunks WHERE document_id = ?').run(id);
    const res = sqlite.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return res.changes;
  },

  // Clear all documents
  clearAllDocuments: (userId?: string): void => {
    if (userId) {
      const docs = sqlite.prepare('SELECT id FROM documents WHERE user_id = ? OR user_id IS NULL').all(userId) as { id: string }[];
      const ids = docs.map((d) => d.id);
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
