'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { fetchRedirectsConfig, saveRedirectsConfig } from "@/lib/redirects-groups/api";
import { createEmptyEntry, createEmptyGroup } from "@/lib/redirects-groups/model";
import { buildConfig, parseInitialContent } from "@/lib/redirects-groups/serialization";
import {
  ensureUniqueGroupName,
  findGroupById,
  findParentOf,
  removeGroupById,
  updateGroupById
} from "@/lib/redirects-groups/state";

export function useRedirectsGroups() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [slotsKey, setSlotsKey] = useState("slots");
  const [baseConfig, setBaseConfig] = useState<Record<string, unknown>>({});
  const [rootGroup, setRootGroup] = useState(() => createEmptyGroup("slots"));
  const [sha, setSha] = useState<string>("");

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

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
        const data = await fetchRedirectsConfig();
        const parsed = parseInitialContent(data.config.content);

        if (cancelled) {
          return;
        }

        setSlotsKey(parsed.slotsKey);
        setBaseConfig(parsed.baseConfig);
        setRootGroup(parsed.rootGroup);
        setSha(data.config.sha);

        const initialSelected = parsed.rootGroup.children.at(0)?.id ?? parsed.rootGroup.id;
        setSelectedGroupId(initialSelected);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "加载配置失败");
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
  }, []);

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

      const nextName = ensureUniqueGroupName(parent, groupId, editingName);
      setRootGroup((current) => {
        const [updated] = updateGroupById(current, groupId, (group) => ({ ...group, name: nextName }));
        return updated;
      });

      cancelRename();
    },
    [cancelRename, editingName, rootGroup]
  );

  const addGroup = useCallback((parentId: string) => {
    setRootGroup((current) => {
      const parent = findGroupById(current, parentId);
      if (!parent) {
        return current;
      }

      const name = ensureUniqueGroupName(parent, null, "新分组");
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
  }, []);

  const addEntry = useCallback((groupId: string) => {
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => ({
        ...group,
        entries: [...group.entries, createEmptyEntry()]
      }));
      return updated;
    });
  }, []);

  const removeEntry = useCallback((groupId: string, entryId: string) => {
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => {
        const nextEntries = group.entries.filter((entry) => entry.id !== entryId);
        const normalizedEntries = nextEntries.length === 0 && group.children.length === 0 ? [createEmptyEntry()] : nextEntries;
        return { ...group, entries: normalizedEntries };
      });
      return updated;
    });
  }, []);

  const updateEntryKey = useCallback((groupId: string, entryId: string, nextKey: string) => {
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => ({
        ...group,
        entries: group.entries.map((entry) => (entry.id === entryId ? { ...entry, key: nextKey } : entry))
      }));
      return updated;
    });
  }, []);

  const updateEntryValue = useCallback((groupId: string, entryId: string, nextValue: unknown) => {
    setRootGroup((current) => {
      const [updated] = updateGroupById(current, groupId, (group) => ({
        ...group,
        entries: group.entries.map((entry) => (entry.id === entryId ? { ...entry, value: nextValue } : entry))
      }));
      return updated;
    });
  }, []);

  const removeGroup = useCallback(
    (groupId: string) => {
      if (groupId === rootGroup.id) {
        return;
      }

      const target = findGroupById(rootGroup, groupId);
      const label = target?.name?.trim() || "未命名分组";

      const ok = window.confirm(`确认删除分组“${label}”？\n将同时删除其子分组与内部规则。`);
      if (!ok) {
        return;
      }

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
    [editingGroupId, rootGroup]
  );

  const save = useCallback(() => {
    startTransition(async () => {
      setResultMessage(null);
      setLastCommitUrl(null);

      try {
        const config = buildConfig(rootGroup, baseConfig, slotsKey);
        const result = await saveRedirectsConfig({
          content: JSON.stringify(config, null, 2),
          sha,
          message: "Update groups via WebUI"
        });

        setSha(result.sha);
        setLastCommitUrl(result.commitUrl);
        setResultMessage("保存成功");
      } catch (error) {
        setResultMessage(error instanceof Error ? error.message : "保存失败");
      }
    });
  }, [baseConfig, rootGroup, sha, slotsKey, startTransition]);

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
    isPending,
    save,
    resultMessage,
    lastCommitUrl
  };
}
