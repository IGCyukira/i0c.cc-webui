'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import schema from "@/data/redirects.schema.json";
import type { CommitEntry } from "@/lib/github";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

type ValidationError = {
  message?: string;
  instancePath?: string;
};

type ConfigEditorProps = {
  initialContent: string;
  initialSha: string;
  history: CommitEntry[];
};

type ConfigRuleValue = {
  type?: "prefix" | "exact" | "proxy";
  target?: string;
  to?: string;
  url?: string;
  appendPath?: boolean;
  status?: string;
  priority?: string;
};

type StringRule = { id: string; kind: "string"; value: string };
type ObjectRule = { id: string; kind: "config"; value: ConfigRuleValue };
type Rule = StringRule | ObjectRule;

type PathEntry = {
  id: string;
  path: string;
  rules: Rule[];
};

type PathGroup = {
  id: string;
  name: string;
  entries: PathEntry[];
  children: PathGroup[];
};

type ParsedConfig = {
  slotsKey: string;
  baseConfig: Record<string, unknown>;
  rootGroup: PathGroup;
};

function uniqueId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groupLooksLikeSlots(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => key.startsWith("/"));
}

function createStringRule(value = ""): StringRule {
  return { id: uniqueId(), kind: "string", value };
}

function createConfigRule(initial?: Partial<ConfigRuleValue>): ObjectRule {
  return {
    id: uniqueId(),
    kind: "config",
    value: {
      type: initial?.type,
      target: initial?.target ?? "",
      to: initial?.to ?? "",
      url: initial?.url ?? "",
      appendPath: initial?.appendPath ?? false,
      status: initial?.status ?? "",
      priority: initial?.priority ?? ""
    }
  };
}

function createEmptyEntry(): PathEntry {
  return { id: uniqueId(), path: "", rules: [createConfigRule()] };
}

function createEmptyGroup(name = "新分组"): PathGroup {
  return { id: uniqueId(), name, entries: [createEmptyEntry()], children: [] };
}

function parseRule(value: unknown): Rule {
  if (typeof value === "string") {
    return createStringRule(value);
  }

  if (isRecord(value)) {
    const config: ConfigRuleValue = {
      type: typeof value.type === "string" ? (value.type as ConfigRuleValue["type"]) : undefined,
      target: typeof value.target === "string" ? value.target : "",
      to: typeof value.to === "string" ? value.to : "",
      url: typeof value.url === "string" ? value.url : "",
      appendPath: typeof value.appendPath === "boolean" ? value.appendPath : false,
      status:
        typeof value.status === "number" || typeof value.status === "string" ? String(value.status) : "",
      priority:
        typeof value.priority === "number" || typeof value.priority === "string" ? String(value.priority) : ""
    };
    return createConfigRule(config);
  }

  if (Array.isArray(value)) {
    return createConfigRule({ target: JSON.stringify(value) });
  }

  return createStringRule(typeof value === "undefined" ? "" : JSON.stringify(value));
}

function parseGroup(name: string, source: Record<string, unknown>): PathGroup {
  const entries: PathEntry[] = [];
  const children: PathGroup[] = [];

  Object.entries(source).forEach(([key, value]) => {
    if (key.startsWith("/")) {
      if (Array.isArray(value)) {
        const rules = value.length > 0 ? value.map((item) => parseRule(item)) : [createConfigRule()];
        entries.push({ id: uniqueId(), path: key, rules });
        return;
      }

      entries.push({ id: uniqueId(), path: key, rules: [parseRule(value)] });
      return;
    }

    if (isRecord(value) && groupLooksLikeSlots(value)) {
      children.push(parseGroup(key, value));
      return;
    }

    if (Array.isArray(value)) {
      const rules = value.length > 0 ? value.map((item) => parseRule(item)) : [createConfigRule()];
      entries.push({ id: uniqueId(), path: key, rules });
      return;
    }

    entries.push({ id: uniqueId(), path: key, rules: [parseRule(value)] });
  });

  if (entries.length === 0 && children.length === 0) {
    entries.push(createEmptyEntry());
  }

  return {
    id: uniqueId(),
    name,
    entries,
    children
  };
}

function parseInitialContent(source: string): ParsedConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    parsed = {};
  }

  const config = isRecord(parsed) ? parsed : {};
  const slotKeys = ["Slots", "slots", "SLOT"] as const;
  const detectedKey = slotKeys.find((key) => key in config && isRecord(config[key]));
  const slotsKey = detectedKey ?? "slots";
  const rawSlots = isRecord(config[slotsKey]) ? (config[slotsKey] as Record<string, unknown>) : {};

  const baseConfig = Object.fromEntries(
    Object.entries(config).filter(([key]) => key !== slotsKey)
  );

  const rootGroup = parseGroup(slotsKey, rawSlots);

  return { slotsKey, baseConfig, rootGroup };
}

function buildRule(rule: Rule): unknown {
  if (rule.kind === "string") {
    return rule.value.trim();
  }

  const { type, target, to, url, appendPath, status, priority } = rule.value;
  const output: Record<string, unknown> = {};

  if (type) {
    output.type = type;
  }
  if (target && target.trim().length > 0) {
    output.target = target.trim();
  }
  if (to && to.trim().length > 0) {
    output.to = to.trim();
  }
  if (url && url.trim().length > 0) {
    output.url = url.trim();
  }
  if (appendPath) {
    output.appendPath = true;
  }
  if (status && status.trim().length > 0) {
    const normalized = status.trim();
    output.status = /^[0-9]{1,3}$/.test(normalized) ? Number(normalized) : normalized;
  }
  if (priority && priority.trim().length > 0) {
    const normalized = priority.trim();
    output.priority = /^-?[0-9]+$/.test(normalized) ? Number(normalized) : normalized;
  }

  return output;
}

function buildGroupObject(group: PathGroup): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  group.entries.forEach((entry) => {
    const pathKey = entry.path.trim();
    const values = entry.rules.map((rule) => buildRule(rule));
    result[pathKey] = values.length === 1 ? values[0] : values;
  });

  group.children.forEach((child) => {
    result[child.name] = buildGroupObject(child);
  });

  return result;
}

function buildConfig(rootGroup: PathGroup, baseConfig: Record<string, unknown>, slotsKey: string) {
  return { ...baseConfig, [slotsKey]: buildGroupObject(rootGroup) };
}

function validateConfigObject(config: unknown): ValidationError[] {
  const valid = validateSchema(config);
  if (valid) {
    return [];
  }

  return (validateSchema.errors ?? []).map((error) => ({
    message: error.message,
    instancePath: error.instancePath
  }));
}

function ensureGroupHasEntry(group: PathGroup): PathGroup {
  const ensuredChildren = group.children.map((child) => ensureGroupHasEntry(child));
  if (group.entries.length === 0 && ensuredChildren.length === 0) {
    return { ...group, entries: [createEmptyEntry()], children: ensuredChildren };
  }
  if (ensuredChildren !== group.children) {
    return { ...group, children: ensuredChildren };
  }
  return group;
}

function updateGroupById(group: PathGroup, targetId: string, updater: (group: PathGroup) => PathGroup): [PathGroup, boolean] {
  if (group.id === targetId) {
    return [updater(group), true];
  }

  let children = group.children;
  let changed = false;

  for (let index = 0; index < group.children.length; index += 1) {
    const child = group.children[index];
    const [updatedChild, childChanged] = updateGroupById(child, targetId, updater);
    if (childChanged) {
      if (children === group.children) {
        children = [...group.children];
      }
      children[index] = updatedChild;
      changed = true;
    }
  }

  if (!changed) {
    return [group, false];
  }

  return [{ ...group, children }, true];
}

function removeGroupById(group: PathGroup, targetId: string): [PathGroup, boolean] {
  let changed = false;
  const children: PathGroup[] = [];

  for (const child of group.children) {
    if (child.id === targetId) {
      changed = true;
      continue;
    }
    const [updatedChild, childChanged] = removeGroupById(child, targetId);
    children.push(childChanged ? updatedChild : child);
    changed ||= childChanged;
  }

  if (!changed) {
    return [group, false];
  }

  return [{ ...group, children }, true];
}

function updateEntryById(group: PathGroup, entryId: string, updater: (entry: PathEntry) => PathEntry): [PathGroup, boolean] {
  let changed = false;
  let entries = group.entries;

  const entryIndex = group.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex !== -1) {
    entries = group.entries.map((entry) => (entry.id === entryId ? updater(entry) : entry));
    changed = true;
  }

  let children = group.children;
  for (let index = 0; index < group.children.length; index += 1) {
    const child = group.children[index];
    const [updatedChild, childChanged] = updateEntryById(child, entryId, updater);
    if (childChanged) {
      if (children === group.children) {
        children = [...group.children];
      }
      children[index] = updatedChild;
      changed = true;
    }
  }

  if (!changed) {
    return [group, false];
  }

  return [{ ...group, entries, children }, true];
}

function removeEntryById(group: PathGroup, entryId: string): [PathGroup, boolean] {
  let changed = false;
  let entries = group.entries;

  if (group.entries.some((entry) => entry.id === entryId)) {
    entries = group.entries.filter((entry) => entry.id !== entryId);
    if (entries.length === 0 && group.children.length === 0) {
      entries = [createEmptyEntry()];
    }
    changed = true;
  }

  let children = group.children;
  for (let index = 0; index < group.children.length; index += 1) {
    const child = group.children[index];
    const [updatedChild, childChanged] = removeEntryById(child, entryId);
    if (childChanged) {
      if (children === group.children) {
        children = [...group.children];
      }
      children[index] = updatedChild;
      changed = true;
    }
  }

  if (!changed) {
    return [group, false];
  }

  return [{ ...group, entries, children }, true];
}

export function ConfigEditor({ initialContent, initialSha, history }: ConfigEditorProps) {
  const parsed = useMemo(() => parseInitialContent(initialContent), [initialContent]);
  const [rootGroup, setRootGroup] = useState<PathGroup>(parsed.rootGroup);
  const [slotsKey, setSlotsKey] = useState(parsed.slotsKey);
  const [baseConfig, setBaseConfig] = useState(parsed.baseConfig);
  const [sha, setSha] = useState(initialSha);
  const [commitMessage, setCommitMessage] = useState("Update redirects via WebUI");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRootGroup(parsed.rootGroup);
    setSlotsKey(parsed.slotsKey);
    setBaseConfig(parsed.baseConfig);
  }, [parsed]);

  useEffect(() => {
    setSha(initialSha);
  }, [initialSha]);

  const lastUpdated = useMemo(() => history.at(0)?.author?.date ?? null, [history]);

  const handleFormat = useCallback(() => {
    const normalizeGroup = (group: PathGroup): PathGroup => {
      const normalizedEntries = group.entries.map((entry) => ({
        ...entry,
        path: entry.path.trim(),
        rules: entry.rules.map((rule) =>
          rule.kind === "string"
            ? { ...rule, value: rule.value.trim() }
            : {
                ...rule,
                value: {
                  type: rule.value.type,
                  target: rule.value.target?.trim() ?? "",
                  to: rule.value.to?.trim() ?? "",
                  url: rule.value.url?.trim() ?? "",
                  appendPath: !!rule.value.appendPath,
                  status: rule.value.status?.trim() ?? "",
                  priority: rule.value.priority?.trim() ?? ""
                }
              }
        )
      }));

      const normalizedChildren = group.children.map((child) => normalizeGroup(child));
      const normalizedName = group.name.trim() || group.name;

      if (
        normalizedEntries !== group.entries ||
        normalizedChildren !== group.children ||
        normalizedName !== group.name
      ) {
        return {
          ...group,
          name: normalizedName,
          entries: normalizedEntries,
          children: normalizedChildren
        };
      }

      return group;
    };

    setRootGroup((current) => ensureGroupHasEntry(normalizeGroup(current)));
    setValidationErrors([]);
    setResultMessage("已整理字段空白");
  }, []);

  const handleValidate = useCallback(() => {
    const config = buildConfig(rootGroup, baseConfig, slotsKey);
    const errors = validateConfigObject(config);
    setValidationErrors(errors);
    setResultMessage(errors.length === 0 ? "校验通过" : "校验失败，请检查错误提示");
  }, [rootGroup, baseConfig, slotsKey]);

  const handleSave = useCallback(() => {
    startTransition(async () => {
      setResultMessage(null);
      setLastCommitUrl(null);

      const config = buildConfig(rootGroup, baseConfig, slotsKey);
      const errors = validateConfigObject(config);
      setValidationErrors(errors);
      if (errors.length > 0) {
        setResultMessage("请先修复校验错误后再提交");
        return;
      }

      try {
        const response = await fetch("/api/config", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: JSON.stringify(config, null, 2),
            sha,
            message: commitMessage.trim() || undefined
          })
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
          const errorText = typeof data?.error === "string" ? data.error : "保存失败";
          throw new Error(errorText);
        }

        const data = (await response.json()) as { sha: string; commitUrl: string };
        setSha(data.sha);
        setLastCommitUrl(data.commitUrl);
        setResultMessage("保存成功");
      } catch (error) {
        const message = error instanceof Error ? error.message : "保存失败";
        setResultMessage(message);
      }
    });
  }, [baseConfig, commitMessage, rootGroup, sha, slotsKey, startTransition]);

  const handleGroupNameChange = useCallback((groupId: string, value: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateGroupById(current, groupId, (group) => ({
        ...group,
        name: value
      }));
      return changed ? updated : current;
    });
  }, []);

  const handleAddGroup = useCallback((parentId: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateGroupById(current, parentId, (group) => ({
        ...group,
        children: [...group.children, createEmptyGroup()]
      }));
      return changed ? updated : current;
    });
  }, []);

  const handleRemoveGroup = useCallback((groupId: string) => {
    setRootGroup((current) => {
      if (current.id === groupId) {
        return current;
      }
      const [updated, changed] = removeGroupById(current, groupId);
      return changed ? ensureGroupHasEntry(updated) : current;
    });
  }, []);

  const handleAddPath = useCallback((groupId: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateGroupById(current, groupId, (group) => ({
        ...group,
        entries: [...group.entries, createEmptyEntry()]
      }));
      return changed ? updated : current;
    });
  }, []);

  const handlePathChange = useCallback((entryId: string, value: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateEntryById(current, entryId, (entry) => ({
        ...entry,
        path: value
      }));
      return changed ? updated : current;
    });
  }, []);

  const handleRemovePath = useCallback((entryId: string) => {
    setRootGroup((current) => {
      const [updated, changed] = removeEntryById(current, entryId);
      return changed ? ensureGroupHasEntry(updated) : current;
    });
  }, []);

  const handleAddRule = useCallback((entryId: string, kind: "string" | "config") => {
    setRootGroup((current) => {
      const [updated, changed] = updateEntryById(current, entryId, (entry) => ({
        ...entry,
        rules: [...entry.rules, kind === "string" ? createStringRule() : createConfigRule()]
      }));
      return changed ? updated : current;
    });
  }, []);

  const handleRemoveRule = useCallback((entryId: string, ruleId: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateEntryById(current, entryId, (entry) => {
        const nextRules = entry.rules.filter((rule) => rule.id !== ruleId);
        return {
          ...entry,
          rules: nextRules.length > 0 ? nextRules : [createConfigRule()]
        };
      });
      return changed ? updated : current;
    });
  }, []);

  const handleStringRuleChange = useCallback((entryId: string, ruleId: string, value: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateEntryById(current, entryId, (entry) => ({
        ...entry,
        rules: entry.rules.map((rule) =>
          rule.id === ruleId && rule.kind === "string" ? { ...rule, value } : rule
        )
      }));
      return changed ? updated : current;
    });
  }, []);

  const handleConfigFieldChange = useCallback(
    (entryId: string, ruleId: string, field: keyof ConfigRuleValue, value: string) => {
      setRootGroup((current) => {
        const [updated, changed] = updateEntryById(current, entryId, (entry) => ({
          ...entry,
          rules: entry.rules.map((rule) =>
            rule.id === ruleId && rule.kind === "config"
              ? { ...rule, value: { ...rule.value, [field]: value } }
              : rule
          )
        }));
        return changed ? updated : current;
      });
    },
    []
  );

  const handleConfigTypeChange = useCallback((entryId: string, ruleId: string, value: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateEntryById(current, entryId, (entry) => ({
        ...entry,
        rules: entry.rules.map((rule) =>
          rule.id === ruleId && rule.kind === "config"
            ? { ...rule, value: { ...rule.value, type: value ? (value as ConfigRuleValue["type"]) : undefined } }
            : rule
        )
      }));
      return changed ? updated : current;
    });
  }, []);

  const handleAppendPathToggle = useCallback(
    (entryId: string, ruleId: string, checked: boolean) => {
      setRootGroup((current) => {
        const [updated, changed] = updateEntryById(current, entryId, (entry) => ({
          ...entry,
          rules: entry.rules.map((rule) =>
            rule.id === ruleId && rule.kind === "config"
              ? { ...rule, value: { ...rule.value, appendPath: checked } }
              : rule
          )
        }));
        return changed ? updated : current;
      });
    },
    []
  );

  const handleToggleRuleKind = useCallback((entryId: string, ruleId: string) => {
    setRootGroup((current) => {
      const [updated, changed] = updateEntryById(current, entryId, (entry) => ({
        ...entry,
        rules: entry.rules.map((rule) => {
          if (rule.id !== ruleId) {
            return rule;
          }
          if (rule.kind === "string") {
            return createConfigRule({ target: rule.value });
          }
          const fallback = rule.value.target || rule.value.to || rule.value.url || "";
          return createStringRule(fallback);
        })
      }));
      return changed ? updated : current;
    });
  }, []);

  const renderGroup = useCallback(
    (group: PathGroup, options: { isRoot: boolean }) => {
      const { isRoot } = options;

      return (
        <div key={group.id} className="space-y-4 rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {isRoot ? (
              <h2 className="text-lg font-semibold text-slate-900">redirects.json</h2>
            ) : (
              <label className="flex-1 text-sm text-slate-600">
                分组名称
                <input
                  value={group.name}
                  onChange={(event) => handleGroupNameChange(group.id, event.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Main"
                />
              </label>
            )}
            {!isRoot ? (
              <button
                type="button"
                onClick={() => handleRemoveGroup(group.id)}
                className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                删除分组
              </button>
            ) : null}
          </div>

          {isRoot && lastUpdated ? (
            <p className="text-sm text-slate-500">最近更新：{new Date(lastUpdated).toLocaleString()}</p>
          ) : null}

          <div className="space-y-4">
            {group.entries.map((entry, entryIndex) => (
              <div key={entry.id} className="space-y-4 rounded border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex-1 text-sm text-slate-600">
                    路径
                    <input
                      value={entry.path}
                      onChange={(event) => handlePathChange(entry.id, event.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="/docs"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemovePath(entry.id)}
                    className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    删除路径
                  </button>
                </div>

                <div className="space-y-3">
                  {entry.rules.map((rule, ruleIndex) => (
                    <div key={rule.id} className="rounded border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-700">
                          规则 {entryIndex + 1}.{ruleIndex + 1}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRuleKind(entry.id, rule.id)}
                            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            {rule.kind === "string" ? "切换高级模式" : "切换快捷模式"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRule(entry.id, rule.id)}
                            className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                          >
                            删除
                          </button>
                        </div>
                      </div>

                      {rule.kind === "string" ? (
                        <label className="mt-3 block text-sm text-slate-600">
                          目标地址
                          <input
                            value={rule.value}
                            onChange={(event) => handleStringRuleChange(entry.id, rule.id, event.target.value)}
                            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            placeholder="https://example.com"
                          />
                        </label>
                      ) : (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm text-slate-600">
                            匹配模式
                            <select
                              value={rule.value.type ?? ""}
                              onChange={(event) => handleConfigTypeChange(entry.id, rule.id, event.target.value)}
                              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">自动</option>
                              <option value="prefix">prefix</option>
                              <option value="exact">exact</option>
                              <option value="proxy">proxy</option>
                            </select>
                          </label>
                          <label className="text-sm text-slate-600">
                            target
                            <input
                              value={rule.value.target ?? ""}
                              onChange={(event) => handleConfigFieldChange(entry.id, rule.id, "target", event.target.value)}
                              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="https://example.com"
                            />
                          </label>
                          <label className="text-sm text-slate-600">
                            to
                            <input
                              value={rule.value.to ?? ""}
                              onChange={(event) => handleConfigFieldChange(entry.id, rule.id, "to", event.target.value)}
                              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="https://example.com"
                            />
                          </label>
                          <label className="text-sm text-slate-600">
                            url
                            <input
                              value={rule.value.url ?? ""}
                              onChange={(event) => handleConfigFieldChange(entry.id, rule.id, "url", event.target.value)}
                              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="https://example.com"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={!!rule.value.appendPath}
                              onChange={(event) => handleAppendPathToggle(entry.id, rule.id, event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            appendPath
                          </label>
                          <label className="text-sm text-slate-600">
                            status
                            <input
                              value={rule.value.status ?? ""}
                              onChange={(event) => handleConfigFieldChange(entry.id, rule.id, "status", event.target.value)}
                              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="例如 302"
                            />
                          </label>
                          <label className="text-sm text-slate-600">
                            priority
                            <input
                              value={rule.value.priority ?? ""}
                              onChange={(event) => handleConfigFieldChange(entry.id, rule.id, "priority", event.target.value)}
                              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="例如 10"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddRule(entry.id, "string")}
                    className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    新增快捷规则
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRule(entry.id, "config")}
                    className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    新增高级规则
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => handleAddPath(group.id)}
              className="w-full rounded border border-dashed border-slate-300 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              新增路径
            </button>
          </div>

          <div className="space-y-3">
            {group.children.map((child) => renderGroup(child, { isRoot: false }))}
            <button
              type="button"
              onClick={() => handleAddGroup(group.id)}
              className="w-full rounded border border-dashed border-slate-300 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              新增分组
            </button>
          </div>
        </div>
      );
    },
    [
      handleAddGroup,
      handleAddPath,
      handleAddRule,
      handleAppendPathToggle,
      handleConfigFieldChange,
      handleConfigTypeChange,
      handleGroupNameChange,
      handlePathChange,
      handleRemoveGroup,
      handleRemovePath,
      handleRemoveRule,
      handleStringRuleChange,
      handleToggleRuleKind,
      lastUpdated
    ]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleFormat}
              className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              整理字段
            </button>
            <button
              type="button"
              onClick={handleValidate}
              className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              校验
            </button>
          </div>
        </div>

        {renderGroup(rootGroup, { isRoot: true })}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex-1 text-sm text-slate-600">
            提交说明
            <input
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Update redirects"
              maxLength={200}
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "保存中..." : "保存改动"}
          </button>
        </div>

        {resultMessage ? (
          <p className="text-sm text-slate-600">
            {resultMessage}
            {lastCommitUrl ? (
              <>
                ，<a href={lastCommitUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-500">
                  查看提交
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        {validationErrors.length > 0 ? (
          <ul className="space-y-1 rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {validationErrors.map((error, index) => (
              <li key={`${error.instancePath ?? "error"}-${index}`}>
                {error.instancePath ? `${error.instancePath}: ` : ""}
                {error.message ?? "未知错误"}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <aside className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">最近提交</h3>
        <ul className="space-y-3">
          {history.length === 0 ? <li className="text-sm text-slate-500">暂无历史记录</li> : null}
          {history.map((commit) => (
            <li key={commit.sha} className="rounded border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-medium text-slate-800">{commit.message}</p>
              <p className="text-xs text-slate-500">
                {commit.author?.name ?? "匿名"} · {commit.author?.date ? new Date(commit.author.date).toLocaleString() : "时间未知"}
              </p>
              <a
                href={commit.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
              >
                查看提交
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
