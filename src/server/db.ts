import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { EMBEDDING_VERSION } from './embedding';

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
  // Raw JSON text as stored. Parsing is done (and cached) by the vector store so
  // embeddings are not deserialized on every single retrieval.
  embedding: string | null;
  embedding_version: number;
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

interface RawMessageRow extends Omit<MessageRow, 'sources'> {
  sources: string | null;
}

// Initialize DB
// Resolve relative to this file (project root) so the DB is always created in
// the same place regardless of which CWD the server is started from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../database.sqlite');
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
    embedding_version INTEGER DEFAULT 0,
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
ensureColumn('chunks', 'embedding_version', 'INTEGER DEFAULT 0');

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

  getDocuments: (userId?: string, limit?: number, offset?: number): DocumentRow[] => {
    if (userId) {
      const base = 'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC';
      if (limit !== undefined) {
        return sqlite.prepare(`${base} LIMIT ? OFFSET ?`).all(userId, limit, offset ?? 0) as DocumentRow[];
      }
      return sqlite.prepare(base).all(userId) as DocumentRow[];
    }
    const base = 'SELECT * FROM documents ORDER BY created_at DESC';
    if (limit !== undefined) {
      return sqlite.prepare(`${base} LIMIT ? OFFSET ?`).all(limit, offset ?? 0) as DocumentRow[];
    }
    return sqlite.prepare(base).all() as DocumentRow[];
  },

  getDocument: (id: string, userId?: string): DocumentRow | undefined => {
    if (userId) {
      return sqlite.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId) as DocumentRow | undefined;
    }
    return sqlite.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined;
  },

  // Assign documents uploaded before authentication was enabled to a single
  // tenant so they remain reachable (and are not leaked to every caller).
  backfillLegacyDocuments: (userId: string): number => {
    const res = sqlite.prepare('UPDATE documents SET user_id = ? WHERE user_id IS NULL').run(userId);
    return res.changes;
  },

  setDocumentSummary: (id: string, summary: string): void => {
    sqlite.prepare('UPDATE documents SET summary = ? WHERE id = ?').run(summary, id);
  },

  // Chunks
  createChunk: (id: string, documentId: string, content: string, pageNumber: number, chunkIndex: number, embedding: number[], charStartPos?: number, charEndPos?: number): void => {
    const stmt = sqlite.prepare('INSERT INTO chunks (id, document_id, content, page_number, chunk_index, char_start_pos, char_end_pos, embedding, embedding_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, documentId, content, pageNumber, chunkIndex, charStartPos ?? 0, charEndPos ?? content.length, JSON.stringify(embedding), EMBEDDING_VERSION);
  },

  getAllChunks: (documentId?: string): ChunkRow[] => {
    return (documentId
      ? sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id WHERE c.document_id = ?').all(documentId)
      : sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id').all()) as ChunkRow[];
  },

  // Fetch only chunks belonging to the given documents (SQL-side scoping) so a
  // query never loads rows for documents the caller cannot read.
  getChunksByDocumentIds: (documentIds: string[]): ChunkRow[] => {
    if (documentIds.length === 0) return [];
    const placeholders = documentIds.map(() => '?').join(',');
    return sqlite
      .prepare(`SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id WHERE c.document_id IN (${placeholders})`)
      .all(...documentIds) as ChunkRow[];
  },

  // Chunks whose stored embedding predates the current algorithm version.
  getChunksNeedingReindex: (): { id: string; content: string }[] => {
    return sqlite
      .prepare('SELECT id, content FROM chunks WHERE embedding_version IS NULL OR embedding_version != ?')
      .all(EMBEDDING_VERSION) as { id: string; content: string }[];
  },

  setChunkEmbedding: (id: string, embedding: number[]): void => {
    sqlite
      .prepare('UPDATE chunks SET embedding = ?, embedding_version = ? WHERE id = ?')
      .run(JSON.stringify(embedding), EMBEDDING_VERSION, id);
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

  deleteMessage: (id: string): void => {
    sqlite.prepare('DELETE FROM messages WHERE id = ?').run(id);
  },

  getMessages: (chatId: string, userId?: string, limit?: number, offset?: number): MessageRow[] => {
    let rows: RawMessageRow[];
    if (userId) {
      const chat = sqlite.prepare('SELECT id FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(chatId, userId);
      if (!chat) return [];
      const base = 'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC, rowid ASC';
      if (limit !== undefined) {
        rows = sqlite.prepare(`${base} LIMIT ? OFFSET ?`).all(chatId, limit, offset ?? 0) as RawMessageRow[];
      } else {
        rows = sqlite.prepare(base).all(chatId) as RawMessageRow[];
      }
    } else {
      const base = 'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC, rowid ASC';
      if (limit !== undefined) {
        rows = sqlite.prepare(`${base} LIMIT ? OFFSET ?`).all(chatId, limit, offset ?? 0) as RawMessageRow[];
      } else {
        rows = sqlite.prepare(base).all(chatId) as RawMessageRow[];
      }
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
