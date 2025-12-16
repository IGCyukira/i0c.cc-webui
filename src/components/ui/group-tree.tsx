'use client';

import type { ReactNode } from "react";

import type { RedirectGroup } from "@/lib/redirects-groups/model";

export type GroupTreeProps = {
  groups: RedirectGroup[];
  selectedGroupId: string | null;
  editingGroupId: string | null;
  editingName: string;
  onSelectGroup: (groupId: string) => void;
  onAddChildGroup: (parentId: string) => void;
  onBeginRenameGroup: (groupId: string) => void;
  onEditingNameChange: (value: string) => void;
  onCommitRenameGroup: (groupId: string) => void;
  onCancelRename: () => void;
  onRemoveGroup: (groupId: string) => void;
};

export function GroupTree({
  groups,
  selectedGroupId,
  editingGroupId,
  editingName,
  onSelectGroup,
  onAddChildGroup,
  onBeginRenameGroup,
  onEditingNameChange,
  onCommitRenameGroup,
  onCancelRename,
  onRemoveGroup
}: GroupTreeProps) {
  const render = (items: RedirectGroup[], depth: number): ReactNode =>
    items.map((group) => {
      const selected = group.id === selectedGroupId;
      const isEditing = group.id === editingGroupId;
      const label = group.name.trim() || "未命名分组";

      return (
        <li key={group.id} className="space-y-2">
          <div
            className={`flex items-center justify-between gap-2 rounded-xl px-2 py-2 ${
              selected ? "bg-slate-50" : "hover:bg-slate-50"
            }`}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <button
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className="min-w-0 flex-1 text-left text-sm font-medium text-slate-700"
              title={label}
            >
              {isEditing ? (
                <input
                  value={editingName}
                  onChange={(event) => onEditingNameChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onCommitRenameGroup(group.id);
                    }
                    if (event.key === "Escape") {
                      onCancelRename();
                    }
                  }}
                  onBlur={() => onCommitRenameGroup(group.id)}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <span className="block truncate">{label}</span>
              )}
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onAddChildGroup(group.id)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                title="新增子分组"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onBeginRenameGroup(group.id)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                title="重命名"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onRemoveGroup(group.id)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                title="删除"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {group.children.length > 0 ? <ul className="space-y-1">{render(group.children, depth + 1)}</ul> : null}
        </li>
      );
    });

  return <ul className="space-y-1">{render(groups, 0)}</ul>;
}
