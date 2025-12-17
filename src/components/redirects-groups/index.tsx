'use client';

import { useCallback, useMemo } from "react";

import { GroupTree, Sidebar } from "@/components/ui/sidebar";
import { ContentSkeleton, SidebarSkeletonBody, SidebarSkeletonFooter } from "@/components/ui/skeletons";
import { GroupEntriesEditor } from "@/components/editor/group-entries-editor";
import { useRedirectsGroups } from "@/components/redirects-groups/use-redirects-groups";

export type RedirectsGroupsManagerProps = {
  mobileSidebarOpen?: boolean;
  onMobileSidebarOpenChange?: (open: boolean) => void;
};

export function RedirectsGroupsManager({
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
}: RedirectsGroupsManagerProps) {
  const {
    isLoading,
    loadError,
    slotsKey,
    rootGroup,
    selectedGroupId,
    selectedGroup,
    selectGroup,
    editingGroupId,
    editingName,
    setEditingName,
    beginRename,
    cancelRename,
    commitRename,
    addGroup,
    addEntry,
    removeEntry,
    updateEntryKey,
    updateEntryValue,
    removeGroup,
    isPending,
    save,
    resultMessage,
    lastCommitUrl
  } = useRedirectsGroups();

  const closeMobileSidebar = useCallback(() => {
    onMobileSidebarOpenChange?.(false);
  }, [onMobileSidebarOpenChange]);

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      selectGroup(groupId);
      if (mobileSidebarOpen) {
        closeMobileSidebar();
      }
    },
    [closeMobileSidebar, mobileSidebarOpen, selectGroup]
  );

  const sidebarFooter = useMemo(
    () => (
      <div className="space-y-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? "保存中..." : "保存改动"}
        </button>
        {resultMessage ? (
          <p className="text-sm text-slate-600">
            {resultMessage}
            {lastCommitUrl ? (
              <>
                ，
                <a
                  href={lastCommitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline hover:text-blue-500"
                >
                  查看提交
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    ),
    [isPending, lastCommitUrl, resultMessage, save]
  );

  const sidebarBody = useMemo(
    () => (
      <>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">分组管理</h2>
          <button
            type="button"
            onClick={() => addGroup(rootGroup.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
              <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            新增分组
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleSelectGroup(rootGroup.id)}
          className={
            "mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left " +
            (selectedGroupId === rootGroup.id
              ? "border-slate-300 bg-white text-slate-900"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white")
          }
          title="根目录（直接写在 slots 下的规则）"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
              <path
                d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="truncate text-sm font-medium">根目录</span>
          </span>
          <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">
            {slotsKey}
          </span>
        </button>

        {rootGroup.children.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">暂无分组</p>
        ) : (
          <div className="mt-4">
            <GroupTree
              groups={rootGroup.children}
              selectedGroupId={selectedGroupId}
              editingGroupId={editingGroupId}
              editingName={editingName}
              onSelectGroup={handleSelectGroup}
              onAddChildGroup={addGroup}
              onBeginRenameGroup={beginRename}
              onEditingNameChange={setEditingName}
              onCommitRenameGroup={commitRename}
              onCancelRename={cancelRename}
              onRemoveGroup={removeGroup}
            />
          </div>
        )}
      </>
    ),
    [
      addGroup,
      beginRename,
      cancelRename,
      commitRename,
      editingGroupId,
      editingName,
      handleSelectGroup,
      removeGroup,
      rootGroup.children,
      rootGroup.id,
      selectedGroupId,
      setEditingName,
      slotsKey,
    ]
  );

  const showMobileSidebar = !!mobileSidebarOpen;

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">
        <div className="hidden sm:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
          <Sidebar
            footer={<SidebarSkeletonFooter />}
            className="h-full"
          >
            <SidebarSkeletonBody />
          </Sidebar>
        </div>
        <section className="order-2 min-w-0 flex-1">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <ContentSkeleton />
          </div>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">
        <div className="hidden sm:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
          <Sidebar title="分组" footer={sidebarFooter} className="h-full">
            <div className="text-sm text-slate-600">无法加载分组</div>
          </Sidebar>
        </div>
        <section className="order-2 min-w-0 flex-1">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">
      <div className="hidden sm:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
        <Sidebar footer={sidebarFooter} className="h-full">
          {sidebarBody}
        </Sidebar>
      </div>

      {showMobileSidebar ? (
        <div className="sm:hidden fixed inset-0 z-50 bg-slate-50">
          <div className="h-full overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-6xl space-y-6">
              <Sidebar footer={sidebarFooter}>
                {sidebarBody}
              </Sidebar>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="order-2 min-w-0 flex-1">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          {selectedGroup ? (
            <GroupEntriesEditor
              group={selectedGroup}
              onAddEntry={addEntry}
              onRemoveEntry={removeEntry}
              onUpdateEntryKey={updateEntryKey}
              onUpdateEntryValue={updateEntryValue}
            />
          ) : (
            <div>
              <h1 className="text-lg font-semibold text-slate-900">分组</h1>
              <p className="mt-1 text-sm text-slate-500">从右侧选择分组</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
