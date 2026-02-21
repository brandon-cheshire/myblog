import { contract } from '@myblog/shared';
import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import type { z } from 'zod';

// Types inferred from contract (replaces api/client + api/posts)
export type User = z.infer<
  (typeof contract.auth.getCurrentUser.responses)[200]
>;
export type Post = z.infer<(typeof contract.posts.getPost.responses)[200]>;

// In dev: use /api so Vite proxy forwards to backend (avoids CORS). Set VITE_API_URL to call backend directly.
const useProxy = import.meta.env.DEV && !import.meta.env.VITE_API_URL;
const baseUrl = useProxy
  ? '/api'
  : (() => {
      const origin = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return origin.endsWith('/api')
        ? origin
        : `${origin.replace(/\/$/, '')}/api`;
    })();

// Single React Query client with Bearer token (used for auth, users, posts)
export const tsrClient = initTsrReactQuery(contract, {
  baseUrl,
  api: async ({ path, method, headers, body }) => {
    const token = localStorage.getItem('auth-token');

    const response = await fetch(path, {
      method,
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ?? undefined,
    });

    const responseBody: unknown = await response.json();

    return {
      status: response.status,
      body: responseBody,
      headers: response.headers,
    };
  },
});

// Helpers that need custom fetch (blob or FormData); ts-rest uses JSON by default
export const api = {
  async uploadProfilePicture(file: File): Promise<{ profilePicture: string }> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    const token = localStorage.getItem('auth-token');
    const response = await fetch(`${baseUrl}/users/profile-picture`, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Upload failed' }));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }
    return await response.json();
  },

  async generateTwoFactorQR(): Promise<Blob> {
    const token = localStorage.getItem('auth-token');
    const response = await fetch(`${baseUrl}/auth/2fa/generate`, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Failed to generate 2FA QR code');
    }
    return await response.blob();
  },
};
