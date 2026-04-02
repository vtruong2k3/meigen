import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";

/**
 * Payload embedded inside the NestJS-issued JWT access_token.
 * Backend auth.service.ts → generateTokens() encodes: { sub, email, name, image }
 */
interface JwtPayload {
  sub: string;
  email: string;
  name?: string | null;
  image?: string | null;
  iat?: number;
  exp?: number;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No adapter — NextAuth only manages the JWT session cookie.
  // All user data lives in the NestJS backend DB.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Used by Google OAuth callback to inject access_token directly
        access_token: { label: "Access Token", type: "text" },
      },
      async authorize(credentials) {
        // ── Path A: Google OAuth callback passes access_token directly ──
        if (credentials?.access_token) {
          const token = credentials.access_token as string;
          try {
            const payload = jwtDecode<JwtPayload>(token);
            return {
              id: payload.sub,
              email: payload.email,
              name: payload.name ?? null,
              image: payload.image ?? null,
              accessToken: token,
            };
          } catch {
            return null;
          }
        }

        // ── Path B: Normal email/password login → call NestJS Backend ──
        if (!credentials?.email || !credentials?.password) return null;

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL!;

        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) return null;

        // Backend wraps response with TransformInterceptor: { data: { access_token } }
        const json = await res.json();
        const access_token: string = json?.data?.access_token ?? json?.access_token;
        if (!access_token) return null;

        // Decode the JWT to get user profile (Backend embeds name/email/image in payload)
        const payload = jwtDecode<JwtPayload>(access_token);

        return {
          id: payload.sub,
          email: payload.email,
          name: payload.name ?? null,
          image: payload.image ?? null,
          accessToken: access_token,
        };
      },
    }),
  ],
  callbacks: {
    /** Forward user profile from authorize() → stored in the JWT cookie */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    /** Expose token data to useSession() / getSession() in the browser */
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.user = {
        ...session.user,
        id: (token.id as string) ?? "",
        email: (token.email as string) ?? "",
        name: token.name as string | null | undefined,
        image: token.image as string | null | undefined,
        accessToken: (token.accessToken as string) ?? "",
      } as typeof session.user;
      return session;
    },
  },
});
