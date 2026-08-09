/**
 * Green Quant AI — FastAPI client.
 *
 * Single place that talks to the backend: base URL resolution,
 * user state storage, JSON/multipart fetch helpers, and the live
 * WebSocket channel.
 */
import type { UserOut } from "./backend-types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""; // Use relative path for Next.js proxy

/** Persisted auth blob (localStorage). Survives refreshes, holds user details. */
interface StoredAuth {
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

export function getCurrentUser(): UserOut | null {
  return readAuth()?.user ?? null;
}

export function isAuthenticated(): boolean {
  return Boolean(getCurrentUser());
}

// --------------------------------------------------------------------- auth

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include", // Essential for HttpOnly cookies
    headers: { ...(init.headers ?? {}) },
    cache: "no-store",
  });
  return res;
}

/** Log in with explicit credentials and persist the session. */
export async function login(
  email: string,
  password: string
): Promise<UserOut> {
  const res = await rawFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  if (res.ok) {
    const user = (await res.json()) as UserOut;
    writeAuth({ user });
    return user;
  }

  throw new ApiError(
    res.status,
    res.status === 401 ? "Invalid email or password" : 
    res.status === 403 ? "Account suspended" : "Backend unreachable"
  );
}

/** Register a new user and store, and persist the session. */
export async function register(payload: {
  name: string;
  email: string;
  password: string;
  store_name?: string;
  store_type?: string;
}): Promise<UserOut> {
  const res = await rawFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  if (res.ok) {
    const user = (await res.json()) as UserOut;
    writeAuth({ user });
    return user;
  }

  throw new ApiError(
    res.status,
    res.status === 409 ? "An account with this email already exists" : "Registration failed"
  );
}

export async function logout(): Promise<void> {
  try {
    await rawFetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.error("Logout error", e);
  }
  resetAuth();
}

export function resetAuth(): void {
  writeAuth(null);
}

// -------------------------------------------------------------------- fetch

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const attempt = async (): Promise<Response> => {
    return rawFetch(path, init);
  };

  let res = await attempt();
  if (res.status === 401) {
    resetAuth();
    // In a real app, you might want to redirect to /login here or handle it at a higher level
    if (typeof window !== "undefined" && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Multipart upload (invoice OCR). */
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const res = await rawFetch(path, { method: "POST", body: formData });
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
  if (typeof window === "undefined") return "";
  const base = API_URL || window.location.origin;
  const url = new URL("/ws/dashboard", base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  
  // Note: WebSocket browser API doesn't support setting headers.
  // HttpOnly cookies will automatically be sent if same-origin.
  // We removed token query params to prevent token leakage in URLs.
  
  return url.toString();
}

const apiClient = {
  get: <T>(path: string, init?: RequestInit) => apiFetch<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: any, init?: RequestInit) =>
    apiFetch<T>(path, {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};
export default apiClient;
