'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { fetchRedirectsConfig, saveRedirectsConfig } from "@/lib/redirects-groups/api";
import type { RedirectGroup } from "@/lib/redirects-groups/model";
import { createEmptyEntry, createEmptyGroup } from "@/lib/redirects-groups/model";
import { buildConfig, parseInitialContent } from "@/lib/redirects-groups/serialization";
import {
  ensureUniqueGroupName,
  findGroupById,
  findParentOf,
  removeGroupById,
  updateGroupById
} from "@/lib/redirects-groups/state";

type HistorySnapshot = {
  rootGroup: RedirectGroup;
  selectedGroupId: string | null;
};

function cloneSnapshot(value: HistorySnapshot): HistorySnapshot {
  const sc = (globalThis as unknown as { structuredClone?: (v: unknown) => unknown }).structuredClone;
  if (typeof sc === "function") {
    return sc(value) as HistorySnapshot;
  }
  return JSON.parse(JSON.stringify(value)) as HistorySnapshot;
}

const MAX_HISTORY = 50;

export function useRedirectsGroups() {
  const tGroups = useTranslations("groups");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [slotsKey, setSlotsKey] = useState("slots");
  const [baseConfig, setBaseConfig] = useState<Record<string, unknown>>({});
  const [rootGroup, setRootGroup] = useState(() => createEmptyGroup("slots"));
  const [sha, setSha] = useState<string>("");

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setLoadError(null);
      setResultMessage(null);
      setLastCommitUrl(null);

      try {
        const data = await fetchRedirectsConfig({
          fallbackLoadErrorText: tGroups("loadFail"),
        });
        const parsed = parseInitialContent(data.config.content);

        if (cancelled) {
          return;
        }

        setSlotsKey(parsed.slotsKey);
        setBaseConfig(parsed.baseConfig);
        setRootGroup(parsed.rootGroup);
        setSha(data.config.sha);

        setUndoStack([]);
        setRedoStack([]);

        const initialSelected = parsed.rootGroup.children.at(0)?.id ?? parsed.rootGroup.id;
        setSelectedGroupId(initialSelected);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : tGroups("loadFail"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [tGroups]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const pushUndoSnapshot = useCallback((snapshot: HistorySnapshot) => {
    setUndoStack((prev) => {
      const next = [...prev, cloneSnapshot(snapshot)];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) {
        return prevUndo;
      }

      const snapshot = prevUndo[prevUndo.length - 1];
      const nextUndo = prevUndo.slice(0, -1);

      setRedoStack((prevRedo) => [
        cloneSnapshot({ rootGroup, selectedGroupId }),
        ...prevRedo,
      ]);

      setRootGroup(cloneSnapshot(snapshot).rootGroup);
      setSelectedGroupId(cloneSnapshot(snapshot).selectedGroupId);
      setEditingGroupId(null);
      setEditingName("");

      return nextUndo;
    });
  }, [rootGroup, selectedGroupId]);

  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) {
        return prevRedo;
      }

      const snapshot = prevRedo[0];
      const nextRedo = prevRedo.slice(1);

      setUndoStack((prevUndo) => {
        const next = [...prevUndo, cloneSnapshot({ rootGroup, selectedGroupId })];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });

      setRootGroup(cloneSnapshot(snapshot).rootGroup);
      setSelectedGroupId(cloneSnapshot(snapshot).selectedGroupId);
      setEditingGroupId(null);
      setEditingName("");

      return nextRedo;
    });
  }, [rootGroup, selectedGroupId]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) {
      return null;
    }
    return findGroupById(rootGroup, selectedGroupId);
  }, [rootGroup, selectedGroupId]);

  const selectGroup = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
  }, []);

  const beginRename = useCallback(
    (groupId: string) => {
      const group = findGroupById(rootGroup, groupId);
      if (!group) {
        return;
      }
      setEditingGroupId(groupId);
      setEditingName(group.name);
    },
    [rootGroup]
  );

  const cancelRename = useCallback(() => {
    setEditingGroupId(null);
    setEditingName("");
  }, []);

  const commitRename = useCallback(
    (groupId: string) => {
      const parent = findParentOf(rootGroup, groupId);
      if (!parent) {
        cancelRename();
        return;
      }

      const nextName = ensureUniqueGroupName(parent, groupId, editingName, tGroups("newGroup"));
      pushUndoSnapshot({ rootGroup, selectedGroupId });
      setRootGroup((current) => {
        const [updated] = updateGroupById(current, groupId, (group) => ({ ...group, name: nextName }));
        return updated;
      });

      cancelRename();
    },
    [cancelRename, editingName, pushUndoSnapshot, rootGroup, selectedGroupId, tGroups]
  );

  const addGroup = useCallback((parentId: string) => {
    pushUndoSnapshot({ rootGroup, selectedGroupId });
    setRootGroup((current) => {
      const parent = findGroupById(current, parentId);
      if (!parent) {
        return current;
      }

      const name = ensureUniqueGroupName(parent, null, tGroups("newGroup"), tGroups("newGroup"));
      const group = createEmptyGroup(name);

      const [updated] = updateGroupById(current, parentId, (g) => ({
        ...g,
        children: [...g.children, group]
      }));

      setSelectedGroupId(group.id);
      setEditingGroupId(group.id);
      setEditingName(group.name);

      return updated;
    });
  }, [pushUndoSnapshot, rootGroup, selectedGroupId, tGroups]);

  const addEntry = useCallback((groupId: string) => {
    pushUndoSnapshot({ rootGroup, selectedGroupId });
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => ({
        ...group,
        entries: [...group.entries, createEmptyEntry()]
      }));
      return updated;
    });
  }, [pushUndoSnapshot, rootGroup, selectedGroupId]);

  const removeEntry = useCallback((groupId: string, entryId: string) => {
    pushUndoSnapshot({ rootGroup, selectedGroupId });
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => {
        const nextEntries = group.entries.filter((entry) => entry.id !== entryId);
        const normalizedEntries = nextEntries.length === 0 && group.children.length === 0 ? [createEmptyEntry()] : nextEntries;
        return { ...group, entries: normalizedEntries };
      });
      return updated;
    });
  }, [pushUndoSnapshot, rootGroup, selectedGroupId]);

  const updateEntryKey = useCallback((groupId: string, entryId: string, nextKey: string) => {
    pushUndoSnapshot({ rootGroup, selectedGroupId });
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => ({
        ...group,
        entries: group.entries.map((entry) => (entry.id === entryId ? { ...entry, key: nextKey } : entry))
      }));
      return updated;
    });
  }, [pushUndoSnapshot, rootGroup, selectedGroupId]);

  const updateEntryValue = useCallback((groupId: string, entryId: string, nextValue: unknown) => {
    pushUndoSnapshot({ rootGroup, selectedGroupId });
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => ({
        ...group,
        entries: group.entries.map((entry) => (entry.id === entryId ? { ...entry, value: nextValue } : entry))
      }));
      return updated;
    });
  }, [pushUndoSnapshot, rootGroup, selectedGroupId]);

  const removeGroup = useCallback(
    (groupId: string) => {
      if (groupId === rootGroup.id) {
        return;
      }

      const target = findGroupById(rootGroup, groupId);
      const label = target?.name?.trim() || tGroups("unnamed");

      const ok = window.confirm(tGroups("confirmDelete", { label }));
      if (!ok) {
        return;
      }

      pushUndoSnapshot({ rootGroup, selectedGroupId });
      setRootGroup((current) => {
        const [updated, changed] = removeGroupById(current, groupId);
        if (!changed) {
          return current;
        }

        setSelectedGroupId((prev) => {
          if (prev !== groupId) {
            return prev;
          }
          return updated.id;
        });

        return updated;
      });

      setEditingGroupId((prev) => (prev === groupId ? null : prev));
      setEditingName((prev) => (editingGroupId === groupId ? "" : prev));
    },
    [editingGroupId, pushUndoSnapshot, rootGroup, selectedGroupId, tGroups]
  );

  const applyJson = useCallback(
    (content: string) => {
      const parsed = parseInitialContent(content);

      pushUndoSnapshot({ rootGroup, selectedGroupId });

      setSlotsKey(parsed.slotsKey);
      setBaseConfig(parsed.baseConfig);
      setRootGroup(parsed.rootGroup);

      const nextSelected = parsed.rootGroup.children.at(0)?.id ?? parsed.rootGroup.id;
      setSelectedGroupId(nextSelected);
      setEditingGroupId(null);
      setEditingName("");
    },
    [pushUndoSnapshot, rootGroup, selectedGroupId]
  );

  const save = useCallback((overrideContent?: string) => {
    startTransition(async () => {
      setResultMessage(null);
      setLastCommitUrl(null);

      try {
        const config = buildConfig(rootGroup, baseConfig, slotsKey);
        const content = overrideContent ?? JSON.stringify(config, null, 2);
        const result = await saveRedirectsConfig(
          {
            content,
            sha,
            message: "Update groups via WebUI"
          },
          {
            fallbackSaveErrorText: tGroups("saveFail")
          }
        );

        setSha(result.sha);
        setLastCommitUrl(result.commitUrl);
        setResultMessage(tGroups("saveOk"));
      } catch (error) {
        setResultMessage(error instanceof Error ? error.message : tGroups("saveFail"));
      }
    });
  }, [baseConfig, rootGroup, sha, slotsKey, startTransition, tGroups]);

  const previewJson = useMemo(() => {
    try {
      const config = buildConfig(rootGroup, baseConfig, slotsKey);
      return JSON.stringify(config, null, 2);
    } catch (error) {
      return error instanceof Error
        ? tGroups("previewFailWithMessage", { message: error.message })
        : tGroups("previewFailUnknown");
    }
  }, [baseConfig, rootGroup, slotsKey, tGroups]);

  return {
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
  };
}
