'use client';

import { useMemo, useState } from "react";
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

  const [commitUrlDraft, setCommitUrlDraft] = useState("");

  const [commitUrlDirty, setCommitUrlDirty] = useState(false);

  const commitUrlValue = commitUrlDirty ? commitUrlDraft : (lastCommitUrl ?? "");

  const normalizedCommitUrl = useMemo(() => commitUrlValue.trim(), [commitUrlValue]);
  const canOpenCommitUrl = useMemo(
    () => /^https?:\/\//i.test(normalizedCommitUrl),
    [normalizedCommitUrl]
  );

  const commitUrlHint = useMemo(() => {
    if (!normalizedCommitUrl) {
      return null;
    }

    if (!canOpenCommitUrl) {
      return tGroups("commitUrlInvalid");
    }

    const looksLikeJson = /\.json(\?|#|$)/i.test(normalizedCommitUrl);
    const looksLikeGitHubCommit = /\/commit\//i.test(normalizedCommitUrl);
    if (!looksLikeJson && !looksLikeGitHubCommit) {
      return tGroups("commitUrlTypeHint");
    }

    return null;
  }, [canOpenCommitUrl, normalizedCommitUrl, tGroups]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-600">{tGroups("commitUrl")}</div>
        <div className="flex items-center gap-2">
          <input
            value={commitUrlValue}
            onChange={(e) => {
              if (!commitUrlDirty) {
                setCommitUrlDirty(true);
              }
              setCommitUrlDraft(e.target.value);
            }}
            placeholder={tGroups("commitUrlPlaceholder")}
            className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <a
            href={canOpenCommitUrl ? normalizedCommitUrl : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!canOpenCommitUrl}
            aria-label={tGroups("viewCommit")}
            title={tGroups("viewCommit")}
            className={
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white " +
              (canOpenCommitUrl
                ? "text-slate-700 hover:bg-slate-50"
                : "pointer-events-none cursor-not-allowed text-slate-300")
            }
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 3h7v7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 3l-9 9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {commitUrlHint ? (
          <div className="text-xs text-rose-600">{commitUrlHint}</div>
        ) : null}
      </div>

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
        </p>
      ) : null}
    </div>
  );
}
