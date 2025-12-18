'use client';

import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function SignInPanel() {
  const t = useTranslations("auth");

  return (
    <div className="w-full max-w-md">
      <div
        className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg will-change-transform animate-[panel-in_520ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 animate-[fade-left_420ms_ease-out] [animation-delay:120ms] [animation-fill-mode:both] motion-reduce:animate-none">
            <span className="h-1 w-8 rounded-full bg-slate-900" />
            i0c.cc
          </div>

          <LanguageSwitcher />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-slate-900 animate-[fade-up_420ms_ease-out] [animation-delay:160ms] [animation-fill-mode:both] motion-reduce:animate-none">
          {t("signInTitle")}
        </h1>

        <button
          type="button"
          onClick={() => signIn("github")}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 animate-[fade-up_420ms_ease-out] [animation-delay:240ms] [animation-fill-mode:both] motion-reduce:animate-none"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.34c-2.02.37-2.6-.49-2.77-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.2 1.87.86 2.33.65.07-.52.28-.86.5-1.06-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.45.55.38A8 8 0 0 0 8 0" />
          </svg>
          {t("signInWithGithub")}
        </button>
      </div>
    </div>
  );
}
