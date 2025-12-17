import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";

import { SignInPanel } from "@/components/sign-in-panel";
import { authOptions } from "@/auth/config";
import { RedirectsGroupsPage } from "@/components/redirects-groups/redirects-groups-page";

type SessionWithToken = Session & { accessToken: string };

function hasAccessToken(session: Session | null): session is SessionWithToken {
  return !!session && typeof (session as Session & { accessToken?: unknown }).accessToken === "string";
}

export default async function Home() {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!hasAccessToken(session)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <SignInPanel />
      </main>
    );
  }

  return (
    <RedirectsGroupsPage />
  );
}
