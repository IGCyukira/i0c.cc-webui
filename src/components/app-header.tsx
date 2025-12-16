'use client';

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";

export function AppHeader() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-slate-900">i0c.cc 控制台</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Beta</span>
      </div>
      {session ? (
        <div className="flex items-center gap-3 text-sm text-slate-700">
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "GitHub 用户"}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : null}
          <span>{session.user?.name ?? session.user?.email ?? "已登录"}</span>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            退出
          </button>
        </div>
      ) : null}
    </header>
  );
}
