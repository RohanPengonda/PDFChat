export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fail(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string') message = data.error;
  } catch {
    // Non-JSON error body; keep the fallback message.
  }
  // Let the app know the token was rejected so it can fall back to login.
  if (res.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pdfchat:unauthorized'));
  }
  throw new ApiError(message, res.status);
}

// All API calls send credentials so the HttpOnly session cookie is attached
// automatically. No Authorization header is sent; the token lives only in the
// cookie, inaccessible to JavaScript.
function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...(extra || {}) };
}

// Read the CSRF cookie for double-submit CSRF protection on state-changing
// requests. Not HttpOnly so JavaScript can read it.
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)pdfchat_csrf=([^;]+)/);
  return match ? match[1] : null;
}

// Headers for state-changing requests (POST/PUT/PATCH/DELETE): include the
// CSRF token read from the cookie so the server can validate it.
export function csrfHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers = { ...(extra || {}) };
  const token = getCsrfToken();
  if (token) headers['X-CSRF-Token'] = token;
  return headers;
}

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  return apiHeaders(extra);
}

export const api = {
  // Validate a token and set it as an HttpOnly cookie. Replaces localStorage
  // storage so the token cannot be read by JavaScript (XSS protection).
  async login(token: string): Promise<{ authenticated: boolean }> {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return fail(res, 'Login failed');
    return res.json();
  },

  async getAuthStatus(): Promise<{ required: boolean; authenticated: boolean }> {
    const res = await fetch('/api/auth/status', {
      method: 'GET',
      headers: apiHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to fetch auth status');
    return res.json();
  },

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: csrfHeaders(),
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Upload failed');
    return res.json();
  },

  async getDocuments() {
    const res = await fetch('/api/documents', {
      headers: apiHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to fetch documents');
    return res.json();
  },

  async createChat() {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: csrfHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to create chat');
    return res.json();
  },

  async getChatHistory(chatId: string) {
    const res = await fetch(`/api/chats/${chatId}`, {
      headers: apiHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to fetch chat history');
    return res.json();
  },

  async deleteDocument(id: string) {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: csrfHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to delete document');
    return res.json();
  },

  async clearAllDocuments() {
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: csrfHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to clear documents');
    return res.json();
  },

  async updateChatTitle(chatId: string, title: string) {
    const res = await fetch(`/api/chats/${chatId}/title`, {
      method: 'PATCH',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title }),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to update chat title');
    return res.json();
  },

  async deleteChat(chatId: string) {
    const res = await fetch(`/api/chats/${chatId}`, {
      method: 'DELETE',
      headers: csrfHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to delete chat');
    return res.json();
  },

  async getDocumentSummary(documentId: string): Promise<string> {
    const res = await fetch(`/api/documents/${documentId}/summary`, {
      method: 'POST',
      headers: apiHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to get summary');
    const data = await res.json();
    return data.summary;
  },

  // `pdfId` scopes suggestions to one document; omit it to draw from every
  // document so "All documents" mode also gets follow-ups.
  async getSuggestions(pdfId: string | undefined, lastQuestion: string): Promise<string[]> {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pdf_id: pdfId, lastQuestion }),
      credentials: 'include',
    });
    if (!res.ok) return fail(res, 'Failed to get suggestions');
    const data = await res.json();
    return data.suggestions || [];
  }
};
