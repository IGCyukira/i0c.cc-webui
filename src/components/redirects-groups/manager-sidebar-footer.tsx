'use client';

import { useTranslations } from "next-intl";

export type ManagerSidebarFooterProps = {
  canUndo: boolean;
  canRedo: boolean;
  isPending: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  resultMessage?: string | null;
  lastCommitUrl?: string | null;
};

export function ManagerSidebarFooter({
  canUndo,
  canRedo,
  isPending,
  onUndo,
  onRedo,
  onSave,
  resultMessage,
  lastCommitUrl,
}: ManagerSidebarFooterProps) {
  const tGroups = useTranslations("groups");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo || isPending}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          title={tGroups("undo")}
          aria-label={tGroups("undo")}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <path d="M9 14l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 20a8 8 0 0 0-8-8H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tGroups("undo")}
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo || isPending}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          title={tGroups("redo")}
          aria-label={tGroups("redo")}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20a8 8 0 0 1 8-8h7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tGroups("redo")}
        </button>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? tGroups("saving") : tGroups("save")}
      </button>
      
      {resultMessage ? (
        <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
          {resultMessage}
          {lastCommitUrl ? (
            <>
              ,
              <a
                href={lastCommitUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full break-all text-blue-600 underline hover:text-blue-500"
              >
                {tGroups("viewCommit")}
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}