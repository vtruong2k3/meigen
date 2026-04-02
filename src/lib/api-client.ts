/**
 * api-client.ts
 * Centralized fetch wrapper for all NestJS Backend API calls.
 *
 * Usage (Client Component / Hook):
 *   const res = await fetchApi("/api/favorites");
 *
 * Features:
 *   - Automatically injects "Authorization: Bearer <token>" from NextAuth session
 *   - Reads base URL from NEXT_PUBLIC_API_URL env var
 *   - Does NOT override Content-Type for FormData (lets browser set boundary)
 */

"use client";

import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/**
 * Fetch wrapper for Client Components and Hooks.
 * Automatically injects the Bearer token from NextAuth session.
 *
 * @param endpoint  - e.g. "/api/favorites" or "api/history"
 * @param options   - standard RequestInit options
 */
export async function fetchApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Retrieve session token from NextAuth (Client-Side)
  let token: string | null = null;
  try {
    const session = await getSession();
    token = session?.user?.accessToken ?? null;
  } catch {
    // Server context or unauthenticated — proceed without token
  }

  // Build headers (preserve existing ones)
  const headers = new Headers(options.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Don't force Content-Type for FormData — browser must set boundary automatically
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Pass cookies for HttpOnly refresh_token
  });
}

/**
 * Convenience helper — builds a query string from an object.
 * Skips undefined/null values.
 */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}
