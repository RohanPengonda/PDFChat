import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { EMBEDDING_VERSION } from './embedding';
import { encryptText, decryptTextLoose } from './encryption';

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
sqlite.pragma('journal_mode = WAL');

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

// Serialize async writes through a promise chain so concurrent writers are
// queued instead of interleaving on the single SQLite connection.
let writeChain: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(task: () => T): Promise<T> {
  const result = writeChain.then(() => task());
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export const db = {
  // Documents
  createDocument: async (id: string, filename: string, originalName: string, userId?: string): Promise<string> => {
    return enqueueWrite(() => {
      const stmt = sqlite.prepare('INSERT INTO documents (id, filename, original_name, user_id) VALUES (?, ?, ?, ?)');
      // original_name is user-supplied and can embed personal filenames; store encrypted.
      stmt.run(id, filename, encryptText(originalName), userId || null);
      return id;
    });
  },

  getDocuments: (userId?: string, limit?: number, offset?: number): DocumentRow[] => {
    const rows = (
      userId
        ? (
            limit !== undefined
              ? sqlite.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(userId, limit, offset ?? 0) as DocumentRow[]
              : sqlite.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC').all(userId) as DocumentRow[]
          )
        : (
            limit !== undefined
              ? sqlite.prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset ?? 0) as DocumentRow[]
              : sqlite.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentRow[]
          )
    );
    return rows.map((r) => ({
      ...r,
      original_name: decryptTextLoose(r.original_name) ?? r.original_name,
      summary: decryptTextLoose(r.summary),
    }));
  },

  getDocument: (id: string, userId?: string): DocumentRow | undefined => {
    const row = userId
      ? (sqlite.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId) as DocumentRow | undefined)
      : (sqlite.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined);
    if (!row) return undefined;
    return { ...row, original_name: decryptTextLoose(row.original_name) ?? row.original_name, summary: decryptTextLoose(row.summary) };
  },

  // Assign documents uploaded before authentication was enabled to a single
  // tenant so they remain reachable (and are not leaked to every caller).
  backfillLegacyDocuments: (userId: string): number => {
    const res = sqlite.prepare('UPDATE documents SET user_id = ? WHERE user_id IS NULL').run(userId);
    return res.changes;
  },

  setDocumentSummary: async (id: string, summary: string): Promise<void> => {
    return enqueueWrite(() => {
      sqlite.prepare('UPDATE documents SET summary = ? WHERE id = ?').run(encryptText(summary), id);
    });
  },

  // Chunks
  createChunk: async (id: string, documentId: string, content: string, pageNumber: number, chunkIndex: number, embedding: number[], charStartPos?: number, charEndPos?: number): Promise<void> => {
    return enqueueWrite(() => {
      const stmt = sqlite.prepare('INSERT INTO chunks (id, document_id, content, page_number, chunk_index, char_start_pos, char_end_pos, embedding, embedding_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, documentId, encryptText(content), pageNumber, chunkIndex, charStartPos ?? 0, charEndPos ?? content.length, encryptText(JSON.stringify(embedding)), EMBEDDING_VERSION);
    });
  },

  getAllChunks: (documentId?: string): ChunkRow[] => {
    const rows = (
      documentId
        ? sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id WHERE c.document_id = ?').all(documentId)
        : sqlite.prepare('SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id').all()
    ) as ChunkRow[];
    return rows.map((c) => ({
      ...c,
      content: decryptTextLoose(c.content) ?? c.content,
      embedding: decryptTextLoose(c.embedding),
      file_name: decryptTextLoose(c.file_name) ?? c.file_name,
    }));
  },

  // Fetch only chunks belonging to the given documents (SQL-side scoping) so a
  // query never loads rows for documents the caller cannot read.
  getChunksByDocumentIds: (documentIds: string[]): ChunkRow[] => {
    if (documentIds.length === 0) return [];
    const placeholders = documentIds.map(() => '?').join(',');
    const rows = sqlite
      .prepare(`SELECT c.*, d.original_name as file_name FROM chunks c JOIN documents d ON c.document_id = d.id WHERE c.document_id IN (${placeholders})`)
      .all(...documentIds) as ChunkRow[];
    return rows.map((c) => ({
      ...c,
      content: decryptTextLoose(c.content) ?? c.content,
      embedding: decryptTextLoose(c.embedding),
      file_name: decryptTextLoose(c.file_name) ?? c.file_name,
    }));
  },

  // Chunks whose stored embedding predates the current algorithm version.
  getChunksNeedingReindex: (): { id: string; content: string }[] => {
    const rows = sqlite
      .prepare('SELECT id, content FROM chunks WHERE embedding_version IS NULL OR embedding_version != ?')
      .all(EMBEDDING_VERSION) as { id: string; content: string }[];
    return rows.map((r) => ({ id: r.id, content: decryptTextLoose(r.content) ?? r.content }));
  },

  setChunkEmbedding: async (id: string, embedding: number[]): Promise<void> => {
    return enqueueWrite(() => {
      sqlite
        .prepare('UPDATE chunks SET embedding = ?, embedding_version = ? WHERE id = ?')
        .run(encryptText(JSON.stringify(embedding)), EMBEDDING_VERSION, id);
    });
  },

  // Chats
  createChat: async (userId?: string): Promise<string> => {
    return enqueueWrite(() => {
      const id = uuidv4();
      const stmt = sqlite.prepare('INSERT INTO chats (id, title, user_id) VALUES (?, ?, ?)');
      stmt.run(id, encryptText('New Chat'), userId || null);
      return id;
    });
  },

  getChat: (id: string, userId?: string): { id: string; title: string | null } | undefined => {
    const row = userId
      ? (sqlite.prepare('SELECT * FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId) as { id: string; title: string | null } | undefined)
      : (sqlite.prepare('SELECT * FROM chats WHERE id = ?').get(id) as { id: string; title: string | null } | undefined);
    if (!row) return undefined;
    return { id: row.id, title: decryptTextLoose(row.title) };
  },

  // Total message count for a chat, used to compute the offset for a
  // most-recent window when reading history through the paginated read path.
  getChatMessageCount: (chatId: string, userId?: string): number => {
    if (userId) {
      const chat = sqlite.prepare('SELECT id FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(chatId, userId);
      if (!chat) return 0;
    }
    const row = sqlite.prepare('SELECT COUNT(*) AS count FROM messages WHERE chat_id = ?').get(chatId) as { count: number };
    return row.count;
  },

  // Update chat title
  updateChatTitle: async (id: string, title: string, userId?: string): Promise<void> => {
    return enqueueWrite(() => {
      if (userId) {
        sqlite.prepare('UPDATE chats SET title = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(encryptText(title), id, userId);
        return;
      }
      sqlite.prepare('UPDATE chats SET title = ? WHERE id = ?').run(encryptText(title), id);
    });
  },

  // Delete chat and its messages
  deleteChat: async (id: string, userId?: string): Promise<number> => {
    return enqueueWrite(() => {
      if (userId) {
        const chat = sqlite.prepare('SELECT id FROM chats WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId);
        if (!chat) return 0;
      }
      sqlite.prepare('DELETE FROM messages WHERE chat_id = ?').run(id);
      const res = sqlite.prepare('DELETE FROM chats WHERE id = ?').run(id);
      return res.changes;
    });
  },

  // Messages
  addMessage: async (chatId: string, role: 'user' | 'assistant', content: string, sources?: Source[]): Promise<string> => {
    return enqueueWrite(() => {
      const id = uuidv4();
      const stmt = sqlite.prepare('INSERT INTO messages (id, chat_id, role, content, sources) VALUES (?, ?, ?, ?, ?)');
      stmt.run(id, chatId, role, encryptText(content), sources && sources.length ? encryptText(JSON.stringify(sources)) : null);
      return id;
    });
  },

  deleteMessage: async (id: string): Promise<void> => {
    return enqueueWrite(() => {
      sqlite.prepare('DELETE FROM messages WHERE id = ?').run(id);
    });
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
      content: decryptTextLoose(r.content) ?? r.content,
      sources: r.sources ? (JSON.parse(decryptTextLoose(r.sources) ?? 'null') as Source[]) : undefined,
    }));
  },

  // Delete document and its chunks
  deleteDocument: async (id: string, userId?: string): Promise<number> => {
    return enqueueWrite(() => {
      if (userId) {
        const doc = sqlite.prepare('SELECT id FROM documents WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId);
        if (!doc) return 0;
      }
      sqlite.prepare('DELETE FROM chunks WHERE document_id = ?').run(id);
      const res = sqlite.prepare('DELETE FROM documents WHERE id = ?').run(id);
      return res.changes;
    });
  },

  // Clear all documents
  clearAllDocuments: async (userId?: string): Promise<void> => {
    return enqueueWrite(() => {
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
    });
  },

  // Close the SQLite handle. Call on process shutdown to avoid database
  // corruption on abrupt termination.
  close: (): void => {
    sqlite.close();
  },
};

// One-time migration: encrypt any legacy plaintext rows now that encryption
// is enabled. Rows already encrypted are left untouched (decrypt succeeds).
const migrateLegacyPlaintextRows = (): void => {
  try {
    const docs = sqlite.prepare('SELECT id, summary FROM documents').all() as { id: string; summary: string | null }[];
    for (const d of docs) {
      const plain = decryptTextLoose(d.summary);
      if (d.summary && plain === d.summary) {
        sqlite.prepare('UPDATE documents SET summary = ? WHERE id = ?').run(encryptText(d.summary), d.id);
      }
    }

    const chunks = sqlite.prepare('SELECT id, content, embedding FROM chunks').all() as { id: string; content: string; embedding: string | null }[];
    for (const c of chunks) {
      const contentPlain = decryptTextLoose(c.content);
      if (contentPlain === c.content) {
        sqlite.prepare('UPDATE chunks SET content = ? WHERE id = ?').run(encryptText(c.content), c.id);
      }
      const embeddingPlain = decryptTextLoose(c.embedding);
      if (c.embedding && embeddingPlain === c.embedding) {
        sqlite.prepare('UPDATE chunks SET embedding = ? WHERE id = ?').run(encryptText(c.embedding), c.id);
      }
    }

    const chats = sqlite.prepare('SELECT id, title FROM chats').all() as { id: string; title: string | null }[];
    for (const ch of chats) {
      const plain = decryptTextLoose(ch.title);
      if (ch.title && plain === ch.title) {
        sqlite.prepare('UPDATE chats SET title = ? WHERE id = ?').run(encryptText(ch.title), ch.id);
      }
    }

    const messages = sqlite.prepare('SELECT id, content, sources FROM messages').all() as { id: string; content: string; sources: string | null }[];
    for (const m of messages) {
      const contentPlain = decryptTextLoose(m.content);
      if (contentPlain === m.content) {
        sqlite.prepare('UPDATE messages SET content = ? WHERE id = ?').run(encryptText(m.content), m.id);
      }
      const sourcesPlain = decryptTextLoose(m.sources);
      if (m.sources && sourcesPlain === m.sources) {
        sqlite.prepare('UPDATE messages SET sources = ? WHERE id = ?').run(encryptText(m.sources), m.id);
      }
    }
  } catch (err) {
    console.error('SQLite encryption migration failed:', err);
  }
};

migrateLegacyPlaintextRows();

// Close the SQLite handle. Call on process shutdown to avoid database
// corruption on abrupt termination.
export const close = (): void => {
  sqlite.close();
};
