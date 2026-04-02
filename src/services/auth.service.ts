/**
 * auth.service.ts
 * Handles Auth API calls to NestJS Backend.
 * Endpoint base: /api/auth
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokenResponse {
  access_token: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Returns { access_token } if successful.
 * Backend also sets `refresh_token` HttpOnly cookie.
 */
export async function register(
  payload: RegisterPayload
): Promise<AuthTokenResponse> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // needed to receive HttpOnly refresh_token cookie
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Register failed: ${res.status}`);
  }

  const json = await res.json();
  // NestJS TransformInterceptor wraps → { data: { access_token } }
  return { access_token: json?.data?.access_token ?? json?.access_token };
}

/**
 * POST /api/auth/logout
 * Clears the HttpOnly refresh_token cookie on the Backend.
 */
export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

/**
 * POST /api/auth/refresh
 * Uses the HttpOnly cookie to get a new access_token.
 * Call this when you detect a 401 response from any protected endpoint.
 */
export async function refreshToken(): Promise<AuthTokenResponse> {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Session expired — please log in again");

  const json = await res.json();
  return { access_token: json?.data?.access_token ?? json?.access_token };
}
