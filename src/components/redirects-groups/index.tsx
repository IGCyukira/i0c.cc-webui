'use client';

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { Sidebar } from "@/components/ui/sidebar";
import { ContentSkeleton, SidebarSkeletonBody, SidebarSkeletonFooter } from "@/components/ui/skeletons";
import { GroupEntriesEditor } from "@/components/editor/group-entries-editor";
import { RightPanel } from "@/components/editor/right-panel";
import { useRedirectsGroups } from "@/composables/redirects-groups";

import { ManagerSidebarBody } from "./manager-sidebar-body";
import { ManagerSidebarFooter } from "./manager-sidebar-footer";

export type RedirectsGroupsManagerProps = {
  mobileSidebarOpen?: boolean;
  onMobileSidebarOpenChange?: (open: boolean) => void;
};

export function RedirectsGroupsManager({
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
}: RedirectsGroupsManagerProps) {
  const tGroups = useTranslations("groups");
  const tEditor = useTranslations("editor");
  const tCommon = useTranslations("common");

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
    canUndo,
    canRedo,
    undo,
    redo,
    isPending,
    save,
    applyJson,
    previewJson,
    resultMessage,
    lastCommitUrl
  } = useRedirectsGroups();

  const [editorMode, setEditorMode] = useState<"rules" | "json">("rules");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const enterRulesMode = useCallback(() => {
    setEditorMode("rules");
    setJsonError(null);
  }, []);

  const enterJsonMode = useCallback(() => {
    setEditorMode("json");
    setJsonDraft(previewJson);
    setJsonError(null);
  }, [previewJson]);

  const handleSave = useCallback(() => {
    if (editorMode === "json") {
      try {
        const normalized = JSON.stringify(JSON.parse(jsonDraft), null, 2);
        setJsonError(null);
        applyJson(normalized);
        save(normalized);
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : tEditor("jsonParseFail"));
      }
      return;
    }

    save();
  }, [applyJson, editorMode, jsonDraft, save, tEditor]);

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

  const showMobileSidebar = !!mobileSidebarOpen;

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">
        <div className="hidden sm:[@media(min-height:600px)]:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
          <Sidebar footer={<SidebarSkeletonFooter />} className="h-full">
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
        <div className="hidden sm:[@media(min-height:600px)]:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
          <Sidebar title={tGroups("group")} className="h-full">
            <div className="text-sm text-slate-600">{tGroups("cannotLoad")}</div>
          </Sidebar>
        </div>
        <section className="order-2 min-w-0 flex-1">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError}</div>
        </section>
      </div>
    );
  }

  const sidebarFooterNode = (
    <ManagerSidebarFooter
      canUndo={canUndo}
      canRedo={canRedo}
      isPending={isPending}
      onUndo={undo}
      onRedo={redo}
      onSave={handleSave}
      resultMessage={resultMessage}
      lastCommitUrl={lastCommitUrl}
    />
  );

  const sidebarBodyNode = (
    <ManagerSidebarBody
      rootGroup={rootGroup}
      slotsKey={slotsKey}
      selectedGroupId={selectedGroupId}
      editingGroupId={editingGroupId}
      editingName={editingName}
      onAddGroup={addGroup}
      onSelectGroup={handleSelectGroup}
      onBeginRename={beginRename}
      onEditingNameChange={setEditingName}
      onCommitRename={commitRename}
      onCancelRename={cancelRename}
      onRemoveGroup={removeGroup}
    />
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">

      <div className="hidden sm:[@media(min-height:600px)]:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
        <Sidebar footer={sidebarFooterNode} className="h-full">
          {sidebarBodyNode}
        </Sidebar>
      </div>

      {showMobileSidebar ? (
        <div className="fixed inset-0 z-40 bg-slate-50 sm:[@media(min-height:600px)]:hidden">
          <div className="h-full overflow-y-auto px-6 pb-6 pt-24">
            <div className="mx-auto max-w-6xl space-y-6">
              <Sidebar footer={sidebarFooterNode}>
                {sidebarBodyNode}
              </Sidebar>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
              >
                {tCommon("close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="order-2 min-w-0 flex-1">
        <RightPanel
          editorMode={editorMode}
          onEnterRulesMode={enterRulesMode}
          onEnterJsonMode={enterJsonMode}
          jsonDraft={jsonDraft}
          onJsonDraftChange={setJsonDraft}
          jsonError={jsonError}
          rulesContent={
            selectedGroup ? (
              <GroupEntriesEditor
                group={selectedGroup}
                onAddEntry={addEntry}
                onRemoveEntry={removeEntry}
                onUpdateEntryKey={updateEntryKey}
                onUpdateEntryValue={updateEntryValue}
              />
            ) : (
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{tGroups("group")}</h1>
                <p className="mt-1 text-sm text-slate-500">{tGroups("selectHint")}</p>
              </div>
            )
          }
        />
      </section>
    </div>
  );
}
