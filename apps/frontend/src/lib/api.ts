const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'finance-tracker.token';

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface ApiOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers = {}, ...rest } = options;
  const token = getStoredToken();

  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] ?? 'application/json';
  }
  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    setStoredToken(null);
    unauthorizedHandler?.();
    throw new ApiError(401, 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบใหม่', null);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? `เกิดข้อผิดพลาด (${response.status})`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const message = record['message'];
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string').join(', ') || null;
  }
  if (typeof message === 'string') return message;
  return null;
}
