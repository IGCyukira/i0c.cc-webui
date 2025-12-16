import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

type NextAuthHandler = typeof import("next-auth/next")["default"];
type AuthConfig = Parameters<NextAuthHandler>[2];

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: requireEnv("GITHUB_CLIENT_ID"),
      clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
      authorization: {
        params: {
          scope: "repo"
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        (token as JWT & { accessToken?: string }).accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      const accessToken = (token as JWT & { accessToken?: unknown }).accessToken;
      if (session.user && typeof accessToken === "string") {
        (session as Session & { accessToken?: string }).accessToken = accessToken;
      }
      return session;
    }
  }
} satisfies AuthConfig;
