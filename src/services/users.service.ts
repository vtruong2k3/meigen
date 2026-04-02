/**
 * users.service.ts
 * Handles User Profile API calls to NestJS Backend.
 * Endpoint base: /api/users
 * All endpoints require Bearer token.
 */

import { fetchApi } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

/** User profile returned by GET /api/users/me */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Returns the current authenticated user's full profile from the database.
 * Use this to get the freshest Name / Image after a profile update.
 * For initial render, prefer decoding the JWT (already in NextAuth session).
 */
export async function getMyProfile(): Promise<UserProfile> {
  const res = await fetchApi("/api/users/me");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Failed to fetch profile: ${res.status}`);
  }
  const json = await res.json();
  return json?.data ?? json;
}
