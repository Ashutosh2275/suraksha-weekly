"use client";

const API_BASE_URL = "http://localhost:8000";
const TOKEN_KEY = "suraksha_worker_token";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: ApiMethod;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const authToken = {
  get(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

async function handleUnauthorized(): Promise<void> {
  authToken.clear();
  if (typeof window !== "undefined") {
    window.location.href = "/onboarding";
  }
}

export async function apiClient<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = authToken.get();
  const method = options.method || "GET";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    await handleUnauthorized();
    throw new ApiError("Unauthorized", 401);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Keep fallback message.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function createIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
