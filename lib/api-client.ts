/**
 * Green Quant AI — FastAPI client.
 *
 * Single place that talks to the backend: base URL resolution, Bearer-token
 * storage, explicit auth helpers, JSON/multipart fetch helpers, and the live
 * WebSocket channel.
 */
import type { TokenResponse, UserOut } from "./backend-types";

const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isDev) return "http://localhost:8000";
    return window.location.origin;
  }
  return "";
};

export const API_URL = getApiUrl();

export const DEMO_CREDENTIALS = {
  email: "rahul@greenshop.ai",
  password: "demo1234",
};

/** Persisted auth blob (localStorage). Survives refreshes. */
interface StoredAuth {
  access_token: string;
  user: UserOut;
}

const AUTH_KEY = "Green Quant_auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ------------------------------------------------------------------ storage

function readAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function writeAuth(auth: StoredAuth | null): void {
  if (typeof window === "undefined") return;
  if (auth) window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  else window.localStorage.removeItem(AUTH_KEY);
}

export function getToken(): string | null {
  return readAuth()?.access_token ?? null;
}

export function getCurrentUser(): UserOut | null {
  return readAuth()?.user ?? null;
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function logout(): void {
  writeAuth(null);
}

// --------------------------------------------------------------------- auth

/** Log in with explicit credentials and persist the session. */
export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  const res = await rawFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let detail = `Login failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  const data = (await res.json()) as TokenResponse;
  writeAuth({ access_token: data.access_token, user: data.user });
  return data;
}

/** Log in with Google OAuth token and persist the session. */
export async function loginWithGoogle(token: string): Promise<TokenResponse> {
  const res = await rawFetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    let detail = `Google login failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  const data = (await res.json()) as TokenResponse;
  writeAuth({ access_token: data.access_token, user: data.user });
  return data;
}

/** Register a new user and store, and persist the session. */
export async function register(
  payload: { name: string; email: string; password: string; store_name?: string; store_type?: string }
): Promise<TokenResponse> {
  const res = await rawFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `Registration failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  const data = (await res.json()) as TokenResponse;
  writeAuth({ access_token: data.access_token, user: data.user });
  return data;
}

/** Explicit authentication check. Does NOT silently log in as demo user. */
export function ensureAuth(): Promise<boolean> {
  return Promise.resolve(readAuth() !== null);
}

/** Reset the cached auth state. */
export function resetAuth(): void {
  logout();
}

// -------------------------------------------------------------------- fetch

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}) },
    cache: "no-store",
  });
  return res;
}

/**
 * JSON fetch with the Bearer token attached. Throws ApiError on non-2xx.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const auth = readAuth();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (auth) headers.Authorization = `Bearer ${auth.access_token}`;

  const res = await rawFetch(path, { ...init, headers });

  if (res.status === 401) {
    logout();
    throw new ApiError(401, "Session expired or unauthorized. Please log in.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const parsed = await res.json();
      detail = parsed.detail || JSON.stringify(parsed);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Same as apiFetch but returns raw text body. */
export async function apiFetchText(
  path: string,
  init: RequestInit = {}
): Promise<string> {
  const auth = readAuth();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (auth) headers.Authorization = `Bearer ${auth.access_token}`;

  const res = await rawFetch(path, { ...init, headers });

  if (res.status === 401) {
    logout();
    throw new ApiError(401, "Session expired or unauthorized. Please log in.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return res.text();
}

/** Multipart upload (invoice OCR). Auth header + FormData body. */
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const auth = readAuth();
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${auth.access_token}`;
  const res = await rawFetch(path, { method: "POST", headers, body: formData });
  if (!res.ok) {
    throw new ApiError(res.status, `Upload failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Health check endpoint. */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await rawFetch("/api/health");
    return res.ok;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------- live

export function dashboardWsUrl(): string {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/dashboard";
  const token = getToken();
  if (token) url.searchParams.set("token", token);
  return url.toString();
}
