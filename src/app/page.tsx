import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";

import { AppHeader } from "@/components/app-header";
import { ConfigEditor } from "@/components/config-editor";
import { SignInPanel } from "@/components/sign-in-panel";
import { authOptions } from "@/auth/config";
import { getRedirectConfig, listRedirectHistory } from "@/lib/github";

type SessionWithToken = Session & { accessToken: string };

function hasAccessToken(session: Session | null): session is SessionWithToken {
  return !!session && typeof (session as Session & { accessToken?: unknown }).accessToken === "string";
}

export default async function Home() {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!hasAccessToken(session)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <SignInPanel />
        </main>
      </div>
    );
  }

  let errorMessage: string | null = null;
  let config: Awaited<ReturnType<typeof getRedirectConfig>> | null = null;
  let history: Awaited<ReturnType<typeof listRedirectHistory>> = [];

  try {
    [config, history] = await Promise.all([
      getRedirectConfig(session.accessToken),
      listRedirectHistory(session.accessToken, 10)
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "加载配置失败";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {errorMessage ? (
          <div className="rounded border border-red-200 bg-red-50 p-6 text-red-700">
            <h2 className="text-lg font-semibold">无法载入配置</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        ) : config ? (
          <ConfigEditor initialContent={config.content} initialSha={config.sha} history={history} />
        ) : null}
      </main>
    </div>
  );
}
