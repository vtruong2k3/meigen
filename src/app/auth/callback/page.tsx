"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * /auth/callback
 * Landing page after Google OAuth via NestJS Backend.
 *
 * Flow:
 *  1. User clicks "Login with Google"
 *  2. Redirect to http://localhost:5000/api/auth/google (NestJS)
 *  3. Google handles auth → NestJS callback issues JWT
 *  4. NestJS redirects to http://localhost:3005/auth/callback?access_token=xxx
 *  5. This page reads the token, calls NextAuth signIn to store session
 *  6. Redirects to home /
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const access_token = searchParams.get("access_token");

    if (!access_token) {
      console.error("[auth/callback] No access_token in URL");
      window.location.replace("/?error=oauth_failed");
      return;
    }

    // Use NextAuth Credentials signIn — the authorize() function accepts access_token directly
    signIn("credentials", {
      access_token,
      redirect: false,
    }).then((result) => {
      if (result?.error) {
        console.error("[auth/callback] signIn failed:", result.error);
        window.location.replace("/?error=oauth_failed");
      } else {
        window.location.replace("/");
      }
    });
  }, [searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Simple animated spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
