'use client';

import type { RedirectGroup } from "@/lib/redirects-groups/model";

import { RouteEntryEditor } from "@/components/redirects-groups/route-entry-editor";

export type GroupEntriesEditorProps = {
  group: RedirectGroup;
  onAddEntry: (groupId: string) => void;
  onRemoveEntry: (groupId: string, entryId: string) => void;
  onUpdateEntryKey: (groupId: string, entryId: string, nextKey: string) => void;
  onUpdateEntryValue: (groupId: string, entryId: string, nextValue: unknown) => void;
};

export function GroupEntriesEditor({
  group,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntryKey,
  onUpdateEntryValue,
}: GroupEntriesEditorProps) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-slate-400"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-lg font-semibold text-slate-900">{group.name}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">编辑该分组内的 redirects 规则</p>
        </div>

        <button
          type="button"
          onClick={() => onAddEntry(group.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          新增规则
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {group.entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-medium text-slate-600">Path key</label>
                <input
                  value={entry.key}
                  onChange={(e) => onUpdateEntryKey(group.id, entry.id, e.target.value)}
                  placeholder="/foo 或 /bar/baz"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("确定要删除这条规则吗？")) {
                    onRemoveEntry(group.id, entry.id);
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                title="删除规则"
                aria-label="删除规则"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                  <path
                    d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M10 11v6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <RouteEntryEditor
                value={entry.value}
                onChange={(next) => onUpdateEntryValue(group.id, entry.id, next)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
