/**
 * Centralized API Client with Retries, Logging, and Performance Instrumentation
 */

import firebaseConfig from "../../firebase-applet-config.json";

export interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
}

export class APIError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Executes a fetch request with automatic retries on transient errors and performance monitoring
 */
export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { retries = 2, retryDelay = 1000, skipAuth = false, ...init } = options;
  let attempt = 0;

  const headers = new Headers(init.headers || {});
  if (!skipAuth && !headers.has("Authorization")) {
    // Attempt to inject token from storage if present (synced by use-auth)
    const cachedToken = localStorage.getItem("firebase-token");
    if (cachedToken) {
      headers.set("Authorization", `Bearer ${cachedToken}`);
    }
  }

  // Ensure content-type defaults to JSON if body is provided and not FormData
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const startTime = performance.now();

  while (attempt <= retries) {
    try {
      const response = await fetch(url, { ...init, headers });
      const duration = performance.now() - startTime;

      // Log performance metrics for successful or non-transient calls
      console.log(`[API Monitor] ${init.method || "GET"} ${url} - Status ${response.status} in ${duration.toFixed(1)}ms (Attempt ${attempt + 1})`);

      // If response is successful, or is a standard client-side error (4xx) that shouldn't be retried
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return wrapResponseWithSafeJson(response);
      }

      // If transient server-side error (5xx), trigger retry logic
      if (response.status >= 500) {
        throw new APIError(`Server returned transient status ${response.status}`, response.status);
      }
    } catch (error: any) {
      attempt++;
      if (attempt > retries) {
        console.error(`[API Monitor] Max retry attempts (${retries + 1}) reached for ${url}. Error:`, error);
        throw error;
      }

      console.warn(`[API Monitor] Transient error on ${url} (Attempt ${attempt}). Retrying in ${retryDelay}ms... Error:`, error.message || error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw new Error(`Failed request to ${url} after ${retries} retries`);
}

/**
 * Standardized typed JSON requests
 */
export async function apiRequest<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithRetry(url, options);
  
  let data: any;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const text = await response.text();
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { text };
      }
    } else {
      data = {};
    }
  } else {
    const text = await response.text();
    data = text ? { text } : {};
  }

  if (!response.ok) {
    throw new APIError(data?.error || "An unexpected API error occurred", response.status, data);
  }

  return data as T;
}

let originalFetch = window.fetch;

/**
 * Wraps a fetch Response object to safely override response.json().
 * If the response body is empty or contains invalid JSON, it resolves with an empty object {}
 * rather than throwing "Unexpected end of JSON input" or invalid JSON exceptions.
 */
export function wrapResponseWithSafeJson(response: Response): Response {
  try {
    const contentType = response.headers.get("content-type") || "";
    // Preserve event-streams (SSE) untouched to avoid disturbing active streams
    if (contentType.includes("text/event-stream")) {
      return response;
    }

    const responseClone = response.clone();
    const customJson = async () => {
      try {
        const text = await responseClone.text();
        if (!text || !text.trim()) {
          return {};
        }
        return JSON.parse(text);
      } catch (e) {
        console.warn("[Global API Monitor] Safe JSON parsing fallback triggered:", e);
        return {};
      }
    };

    try {
      response.json = customJson;
    } catch (e) {
      try {
        Object.defineProperty(response, "json", {
          value: customJson,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e2) {
        console.warn("[Global API Monitor] Could not redefine response.json:", e2);
      }
    }
  } catch (err) {
    console.warn("[Global API Monitor] Failed to wrap response with safe JSON handler:", err);
  }
  return response;
}

const isTokenProjectValid = (token: string, expectedProjectId: string): boolean => {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const base64Url = parts[1];
      let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      const payload = JSON.parse(atob(base64));
      return payload.aud === expectedProjectId;
    }
  } catch (e) {
    console.warn("[Global API Monitor] Failed to decode JWT token:", e);
  }
  return true;
};

/**
 * Installs a global fetch interceptor to automatically inject Authorization tokens,
 * retry transient errors, format content-types, and instrument API performance.
 */
export function setupGlobalFetchInterceptor() {
  if (typeof window === "undefined" || (window as any).__fetchInterceptorInstalled) return;

  try {
    originalFetch = window.fetch;
    if (!originalFetch) {
      console.warn("[Global API Monitor] window.fetch is not available.");
      return;
    }

    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const urlString = typeof input === "string" 
        ? input 
        : (input instanceof URL ? input.href : input.url);

      // Only intercept local API endpoints
      if (urlString.startsWith("/api/") || urlString.includes("/api/")) {
        const headers = new Headers(init?.headers || {});

        // Automatically inject Bearer Token if not already present
        if (!headers.has("Authorization")) {
          const cachedToken = localStorage.getItem("firebase-token");
          if (cachedToken) {
            if (isTokenProjectValid(cachedToken, firebaseConfig.projectId)) {
              headers.set("Authorization", `Bearer ${cachedToken}`);
            } else {
              console.warn(`[Global API Monitor] Found stale token with mismatching audience. Removing from localStorage.`);
              localStorage.removeItem("firebase-token");
            }
          }
        } else {
          // If authorization header is manually specified, double check its audience
          const authHeader = headers.get("Authorization");
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split("Bearer ")[1];
            if (!isTokenProjectValid(token, firebaseConfig.projectId)) {
              console.warn(`[Global API Monitor] Explicit Bearer token has audience mismatch. Removing header.`);
              headers.delete("Authorization");
            }
          }
        }

        // Automatically set Content-Type if JSON payload
        if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }

        // Execute request with retries and performance tracking
        let attempt = 0;
        const retries = 2;
        const retryDelay = 1000;
        const startTime = performance.now();

        while (attempt <= retries) {
          try {
            const response = await originalFetch(input, { ...init, headers });
            const duration = performance.now() - startTime;

            // Log performance metrics
            console.log(`[Global API Monitor] ${init?.method || "GET"} ${urlString} - Status ${response.status} in ${duration.toFixed(1)}ms (Attempt ${attempt + 1})`);

            // If unauthorized (401), try to auto-refresh token and retry once
            if (response.status === 401 && attempt === 0) {
              try {
                const { getAuth, signOut } = await import("firebase/auth");
                const auth = getAuth();
                if (auth.currentUser) {
                  const currentToken = await auth.currentUser.getIdToken();
                  if (!isTokenProjectValid(currentToken, firebaseConfig.projectId)) {
                    console.warn("[Global API Monitor] Current user session has audience mismatch. Forcing logout.");
                    await signOut(auth);
                    localStorage.removeItem("firebase-token");
                    return wrapResponseWithSafeJson(response);
                  }

                  console.log("[Global API Monitor] Token unauthorized (401). Attempting dynamic session refresh...");
                  const freshToken = await auth.currentUser.getIdToken(true);
                  if (isTokenProjectValid(freshToken, firebaseConfig.projectId)) {
                    localStorage.setItem("firebase-token", freshToken);
                    headers.set("Authorization", `Bearer ${freshToken}`);
                    // Retry fetch with fresh token
                    const retryResponse = await originalFetch(input, { ...init, headers });
                    if (retryResponse.ok) {
                      console.log("[Global API Monitor] Request succeeded after dynamic token refresh!");
                      return wrapResponseWithSafeJson(retryResponse);
                    }
                  } else {
                    console.warn("[Global API Monitor] Refreshed token still has audience mismatch. Forcing logout.");
                    await signOut(auth);
                    localStorage.removeItem("firebase-token");
                  }
                }
              } catch (refreshErr) {
                console.error("[Global API Monitor] Dynamic token refresh failed:", refreshErr);
              }
            }

            // Return immediately for success or standard client-side errors (4xx)
            if (response.ok || (response.status >= 400 && response.status < 500)) {
              return wrapResponseWithSafeJson(response);
            }

            if (response.status >= 500) {
              throw new Error(`Transient status ${response.status}`);
            }
          } catch (error: any) {
            // Do NOT retry if the request was aborted (e.g. Stop Generation)
            if (error?.name === "AbortError" || String(error?.message).toLowerCase().includes("abort")) {
              throw error;
            }

            attempt++;
            if (attempt > retries) {
              console.error(`[Global API Monitor] Max retries (${retries + 1}) failed for ${urlString}. Error:`, error);
              throw error;
            }

            console.warn(`[Global API Monitor] Retrying ${urlString} (Attempt ${attempt}) in ${retryDelay * attempt}ms... Error:`, error.message || error);
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }

      // Default fetch for non-API or external resources
      return originalFetch(input, init);
    };

    // Attempt to redefine window.fetch safely
    let success = false;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, "fetch");
      if (!descriptor || descriptor.configurable) {
        Object.defineProperty(window, "fetch", {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
        success = true;
      }
    } catch (e) {
      // Ignore descriptor error and fall through
    }

    if (!success) {
      try {
        (window as any).fetch = customFetch;
        success = true;
      } catch (e) {
        // Ignore assignment error
      }
    }

    if (!success) {
      try {
        const globalObj = typeof globalThis !== "undefined" ? globalThis : window;
        Object.defineProperty(globalObj, "fetch", {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
        success = true;
      } catch (e) {
        // Ignore fallback
      }
    }

    if (success) {
      (window as any).__fetchInterceptorInstalled = true;
      console.log("[Global API Monitor] Successfully registered fetch interception wrapper.");
    } else {
      console.warn("[Global API Monitor] Global fetch is read-only. API calls will rely on explicit Authorization headers.");
    }
  } catch (error) {
    console.warn("[Global API Monitor] Failed to install global fetch interceptor safely:", error);
  }
}
