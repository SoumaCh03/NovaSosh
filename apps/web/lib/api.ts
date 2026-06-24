import { ApiErrorResponse } from '@nova/shared-types';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiClient {
  private static getHeaders(token?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return {} as T;
    }

    if (response.status === 401) {
      // Clear session on unauthorized
      if (typeof window !== 'undefined') {
        useAuthStore.getState().clearSession();
      }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = data.error?.message || 'Something went wrong';
      const errorObj = new Error(errorMsg);
      (errorObj as any).code = data.error?.code || 'INTERNAL_ERROR';
      (errorObj as any).details = data.error?.details || [];
      (errorObj as any).statusCode = response.status;
      throw errorObj;
    }

    return data as T;
  }

  static async get<T>(path: string, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse<T>(response);
  }

  static async post<T>(path: string, body: any, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  static async delete<T>(path: string, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    return this.handleResponse<T>(response);
  }

  static async put<T>(path: string, body: any, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  static async deleteWithBody<T>(path: string, body: any, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  static async patch<T>(path: string, body: any, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
      keepalive: true, // helpful for background sync
    });
    return this.handleResponse<T>(response);
  }
}
