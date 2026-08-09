/**
 * Green Quant AI — FastAPI client.
 *
 * Single place that talks to the backend: base URL resolution, Bearer-token
 * storage, demo auto-login, JSON/multipart fetch helpers, and the live
 * WebSocket channel. UI code imports `@/lib/api` (the typed data facade) —
 * only that module and the LiveProvider touch this file.
 */
import type { TokenResponse, UserOut } from "./backend-types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

let authPromise: Promise<boolean> | null = null;

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
  authPromise = Promise.resolve(true);
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
  authPromise = Promise.resolve(true);
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
  authPromise = Promise.resolve(true);
  return data;
}

/**
 * Guarantee a session before hitting authed endpoints. Uses the demo owner
 * account when nothing is stored so the app "just works" against a seeded
 * backend. Returns false when the backend is unreachable — callers then fall
 * back to local demo data.
 */
export function ensureAuth(): Promise<boolean> {
  if (readAuth()) return Promise.resolve(true);
  if (!authPromise) {
    authPromise = login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password)
      .then(() => true)
      .catch(() => {
        authPromise = null; // don't cache a failure — retry next call
        return false;
      });
  }
  return authPromise;
}

/** Reset the cached auth attempt (used after a 401 to force a fresh login). */
export function resetAuth(): void {
  authPromise = null;
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
 * JSON fetch with the Bearer token attached. Retries once with a fresh demo
 * login after a 401. Throws ApiError on non-2xx.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const attempt = async (): Promise<Response> => {
    const auth = readAuth();
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (auth) headers.Authorization = `Bearer ${auth.access_token}`;
    return rawFetch(path, { ...init, headers });
  };

  let res = await attempt();
  if (res.status === 401) {
    resetAuth();
    const ok = await ensureAuth();
    if (ok) res = await attempt();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Same as apiFetch but returns the raw text body (CSV/plain). */
export async function apiFetchText(
  path: string,
  init: RequestInit = {}
): Promise<string> {
  const attempt = async (): Promise<Response> => {
    const auth = readAuth();
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (auth) headers.Authorization = `Bearer ${auth.access_token}`;
    return rawFetch(path, { ...init, headers });
  };

  let res = await attempt();
  if (res.status === 401) {
    resetAuth();
    const ok = await ensureAuth();
    if (ok) res = await attempt();
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

/** Health check — used to decide mock fallback vs live data. */
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
