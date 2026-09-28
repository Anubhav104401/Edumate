/*
 * THE ONE PLACE WHERE THE FRONTEND TALKS TO THE BACKEND.
 *
 * Every screen calls functions in endpoints.ts, and every one of those calls request() below.
 * request() does five jobs, always the same way:
 *   1. turns a JavaScript object into JSON text      (JSON.stringify)
 *   2. adds the headers: Content-Type, Accept and "Authorization: Bearer <token>"
 *   3. sends it with fetch() to /api/... (Vite or nginx forwards it to port 8080)
 *   4. turns the JSON text of the answer back into a JavaScript object (response.json())
 *   5. turns any error answer into an ApiError with a friendly message
 * It also counts the requests still travelling, so the thin loading line at the top of the
 * screen (components/TopLoader.tsx) can show while the app waits for the backend.
 */
import { API_BASE } from '../config';
import { t } from '../i18n/messages';
import type { ApiErrorBody } from './types';

const TOKEN_KEY = 'edumate.token';

/** An error the screens can show directly: `message` is already written for people. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string> | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors ?? {};
  }
}

// ---------- The login token ----------
// Kept in sessionStorage: it survives a page refresh but disappears when the tab is closed.
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

// AuthContext registers a function here, called whenever the backend answers 401 (token expired).
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

// ---------- How many requests are on their way right now ----------
let inFlight = 0;
const activityListeners = new Set<() => void>();

function changeInFlight(by: number): void {
  inFlight += by;
  activityListeners.forEach((listener) => listener());
}

/** Calls `listener` whenever a request starts or finishes. Returns a function that stops listening. */
export function subscribeActivity(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => {
    activityListeners.delete(listener);
  };
}

/** The number of requests still waiting for an answer. */
export function activeRequests(): number {
  return inFlight;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Sends one request and returns the parsed JSON answer.
 * `body` may be a plain object (sent as JSON) or FormData (sent as multipart/form-data, for files).
 */
export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // the browser writes the multipart Content-Type (with its boundary) itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  changeInFlight(+1);
  try {
    let response: Response;
    try {
      response = await fetch(API_BASE + path, { method, headers, body: payload });
    } catch {
      throw new ApiError(0, 'NETWORK', t.errors.network);
    }
    return await handleResponse<T>(response);
  } finally {
    changeInFlight(-1); // runs whether the request worked or failed
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401 && getToken()) {
    onUnauthorized();
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const type = response.headers.get('Content-Type') ?? '';
  if (type.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, body.code, body.message || t.errors.generic, body.fieldErrors);
  } catch {
    // The answer was not our JSON error (for example a proxy error page).
    const message = response.status === 413 ? t.errors.tooLarge : t.errors.generic;
    return new ApiError(response.status, 'HTTP_' + response.status, message);
  }
}

/**
 * Downloads a file (PDF, image, CSV) with the login token and returns it as a Blob.
 * A plain <a href> cannot be used because it would not send the Authorization header.
 */
export async function download(path: string): Promise<Blob> {
  const token = getToken();
  changeInFlight(+1);
  try {
    const response = await fetch(API_BASE + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw await toApiError(response);
    }
    return await response.blob();
  } finally {
    changeInFlight(-1);
  }
}

/**
 * Uploads a FormData body and reports progress (0-100) while the bytes travel.
 * fetch() cannot report upload progress, so this uses the older XMLHttpRequest.
 */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (percent: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + path);
    xhr.setRequestHeader('Accept', 'application/json');
    const token = getToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK', t.errors.network));
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      if (xhr.status === 401) {
        onUnauthorized();
      }
      const err = body as Partial<ApiErrorBody> | null;
      const message = err?.message ?? (xhr.status === 413 ? t.errors.tooLarge : t.errors.generic);
      reject(new ApiError(xhr.status, err?.code ?? 'HTTP_' + xhr.status, message, err?.fieldErrors));
    };
    xhr.send(form);
  });
}

/** Turns any thrown value into text a person can read. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return t.errors.generic;
}
