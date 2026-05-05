const API_BASE_URL = "https://whisperbox.koyeb.app";

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${localStorage.getItem('access_token')}`);
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || `API Error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return false;
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    return true;
  } catch (err) {
    return false;
  }
}

// User & Conversation API Wrappers

export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
}

export interface Conversation {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (!query) return [];
  return fetchAPI(`/users/search?q=${encodeURIComponent(query)}`);
}

export async function getConversations(): Promise<Conversation[]> {
  return fetchAPI('/conversations');
}

export async function getPublicKey(userId: string): Promise<{ public_key: string }> {
  return fetchAPI(`/users/${userId}/public-key`);
}

export interface MessagePayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: MessagePayload;
  delivered: boolean;
  created_at: string;
}

export async function getMessages(userId: string, limit: number = 50, before?: string): Promise<Message[]> {
  let url = `/conversations/${userId}/messages?limit=${limit}`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  return fetchAPI(url);
}

export async function sendMessageOffline(to: string, payload: MessagePayload): Promise<Message> {
  return fetchAPI('/messages', {
    method: 'POST',
    body: JSON.stringify({ to, payload })
  });
}

