'use client';

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";

export type AppHeaderProps = {
  mobileSidebarToggle?: {
    isOpen: boolean;
    onToggle: () => void;
  };
};

export function AppHeader({ mobileSidebarToggle }: AppHeaderProps) {
  const { data: session } = useSession();
  const sidebarToggleLabel = mobileSidebarToggle?.isOpen ? "隐藏分组" : "展开分组";

  return (
    <header className="sticky top-0 z-40 border-b-2 border-slate-200/70 bg-white/80 backdrop-blur shadow-md rounded-b-2xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          {mobileSidebarToggle ? (
            <button
              type="button"
              onClick={mobileSidebarToggle.onToggle}
              aria-pressed={mobileSidebarToggle.isOpen}
              aria-label={sidebarToggleLabel}
              title={sidebarToggleLabel}
              className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              {mobileSidebarToggle.isOpen ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M4 6H20M4 12H20M4 18H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          ) : null}
          <Image
            src="/favicon.ico"
            alt="i0c.cc"
            width={30}
            height={30}
            className="rounded-lg border-2 border-slate-400"
            priority
          />
          <span className="truncate text-lg font-semibold text-slate-900">i0c.cc 控制台</span>
          <span className="hidden sm:inline-flex h-5 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-[11px] font-medium leading-none text-slate-500">
            Beta
          </span>
        </div>

        {session ? (
          <div className="flex min-w-0 items-center gap-3 text-sm text-slate-700">
            {session.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "GitHub 用户"}
                width={28}
                height={28}
                className="rounded-full border border-slate-200"
              />
            ) : null}
            <span className="hidden sm:block max-w-[16rem] truncate text-sm text-slate-600">
              {session.user?.name ?? session.user?.email ?? "已登录"}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              退出
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
