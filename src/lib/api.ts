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
  throw new ApiError(message, res.status);
}

export const api = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return fail(res, 'Upload failed');
    return res.json();
  },

  async getDocuments() {
    const res = await fetch('/api/documents');
    if (!res.ok) return fail(res, 'Failed to fetch documents');
    return res.json();
  },

  async createChat() {
    const res = await fetch('/api/chats', { method: 'POST' });
    if (!res.ok) return fail(res, 'Failed to create chat');
    return res.json();
  },

  async getChatHistory(chatId: string) {
    const res = await fetch(`/api/chats/${chatId}`);
    if (!res.ok) return fail(res, 'Failed to fetch chat history');
    return res.json();
  },

  async deleteDocument(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) return fail(res, 'Failed to delete document');
    return res.json();
  },

  async clearAllDocuments() {
    const res = await fetch('/api/documents', { method: 'DELETE' });
    if (!res.ok) return fail(res, 'Failed to clear documents');
    return res.json();
  },

  async updateChatTitle(chatId: string, title: string) {
    const res = await fetch(`/api/chats/${chatId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return fail(res, 'Failed to update chat title');
    return res.json();
  },

  async getDocumentSummary(documentId: string): Promise<string> {
    const res = await fetch(`/api/documents/${documentId}/summary`, { method: 'POST' });
    if (!res.ok) return fail(res, 'Failed to get summary');
    const data = await res.json();
    return data.summary;
  },

  // `pdfId` scopes suggestions to one document; omit it to draw from every
  // document so "All documents" mode also gets follow-ups.
  async getSuggestions(pdfId: string | undefined, lastQuestion: string): Promise<string[]> {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_id: pdfId, lastQuestion }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions || [];
  }
};
