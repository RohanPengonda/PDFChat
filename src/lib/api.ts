export const api = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  async getDocuments() {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async createChat() {
    const res = await fetch('/api/chats', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create chat');
    return res.json();
  },

  async getChatHistory(chatId: string) {
    const res = await fetch(`/api/chats/${chatId}`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async deleteDocument(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  async clearAllDocuments() {
    const res = await fetch('/api/documents', { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear documents');
    return res.json();
  },

  async updateChatTitle(chatId: string, title: string) {
    const res = await fetch(`/api/chats/${chatId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to update chat title');
    return res.json();
  }
};
