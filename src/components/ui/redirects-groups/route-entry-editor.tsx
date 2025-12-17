'use client';

import { useCallback, useMemo } from "react";

type RouteMode = "string" | "object" | "array";
type DestinationKey = "target" | "to" | "url";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeStatus(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" ? value : "";
}

function normalizePriority(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" ? value : "";
}

function getMode(value: unknown): RouteMode {
  if (Array.isArray(value)) {
    return "array";
  }
  if (isRecord(value)) {
    return "object";
  }
  return "string";
}

function createEmptyConfig(): Record<string, unknown> {
  return { type: "prefix", target: "", appendPath: true };
}

function getDestinationKey(config: Record<string, unknown>): DestinationKey {
  if (typeof config.target === "string") {
    return "target";
  }
  if (typeof config.to === "string") {
    return "to";
  }
  if (typeof config.url === "string") {
    return "url";
  }
  return "target";
}

function setExclusiveDestination(
  config: Record<string, unknown>,
  key: DestinationKey,
  value: string
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };

  delete next.target;
  delete next.to;
  delete next.url;

  next[key] = value;
  return next;
}

export type RouteEntryEditorProps = {
  value: unknown;
  onChange: (next: unknown) => void;
  level?: number;
};

export function RouteEntryEditor({ value, onChange, level = 0 }: RouteEntryEditorProps) {
  const mode = useMemo(() => getMode(value), [value]);

  const setMode = useCallback(
    (nextMode: RouteMode) => {
      if (nextMode === mode) {
        return;
      }
      if (nextMode === "string") {
        onChange("");
        return;
      }
      if (nextMode === "object") {
        onChange(createEmptyConfig());
        return;
      }
      onChange([""]);
    },
    [mode, onChange]
  );

  const stringValue = mode === "string" ? asString(value) : "";
  const configValue = mode === "object" && isRecord(value) ? value : null;
  const arrayValue = mode === "array" && Array.isArray(value) ? value : null;

  const containerClassName = level > 0 ? "mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" : "";

  return (
    <div className={containerClassName}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">规则类型</span>
        <button
          type="button"
          onClick={() => setMode("string")}
          className={
            "rounded-lg border px-2 py-1 text-xs " +
            (mode === "string"
              ? "border-slate-300 bg-white text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
          }
        >
          字符串
        </button>
        <button
          type="button"
          onClick={() => setMode("object")}
          className={
            "rounded-lg border px-2 py-1 text-xs " +
            (mode === "object"
              ? "border-slate-300 bg-white text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
          }
        >
          对象
        </button>
        <button
          type="button"
          onClick={() => setMode("array")}
          className={
            "rounded-lg border px-2 py-1 text-xs " +
            (mode === "array"
              ? "border-slate-300 bg-white text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
          }
        >
          数组
        </button>
      </div>

      {mode === "string" ? (
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600">目标（字符串快捷写法）</label>
          <input
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com 或 /path"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
          />
        </div>
      ) : null}

      {mode === "object" && configValue ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">type</label>
              <select
                value={(configValue.type as string | undefined) ?? "prefix"}
                onChange={(e) => onChange({ ...configValue, type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
              >
                <option value="prefix">prefix</option>
                <option value="exact">exact</option>
                <option value="proxy">proxy</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="inline-flex select-none items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(configValue.appendPath)}
                  onChange={(e) => onChange({ ...configValue, appendPath: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                appendPath
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600">目标地址</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={getDestinationKey(configValue)}
                  onChange={(e) => {
                    const nextKey = e.target.value as DestinationKey;
                    const currentKey = getDestinationKey(configValue);
                    const currentValue = asString(configValue[currentKey]);
                    onChange(setExclusiveDestination(configValue, nextKey, currentValue));
                  }}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                >
                  <option value="target">target</option>
                  <option value="to">to</option>
                  <option value="url">url</option>
                </select>
                <input
                  value={asString(configValue[getDestinationKey(configValue)])}
                  onChange={(e) => {
                    const nextKey = getDestinationKey(configValue);
                    onChange(setExclusiveDestination(configValue, nextKey, e.target.value));
                  }}
                  placeholder="https://example.com"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">status</label>
              <input
                value={normalizeStatus(configValue.status)}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === "" ? undefined : raw;
                  const { status, ...rest } = configValue;
                  onChange(next === undefined ? rest : { ...rest, status: next });
                }}
                placeholder="301"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">priority</label>
              <input
                value={normalizePriority(configValue.priority)}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === "" ? undefined : raw;
                  const { priority, ...rest } = configValue;
                  onChange(next === undefined ? rest : { ...rest, priority: next });
                }}
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
          </div>
        </div>
      ) : null}

      {mode === "array" && arrayValue ? (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">数组规则</span>
            <button
              type="button"
              onClick={() => onChange([...arrayValue, ""])}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              新增一条
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {arrayValue.map((item, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">#{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => onChange(arrayValue.filter((_, i) => i !== index))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    删除
                  </button>
                </div>

                <RouteEntryEditor
                  value={item}
                  onChange={(next) => {
                    const copy = arrayValue.slice();
                    copy[index] = next;
                    onChange(copy);
                  }}
                  level={level + 1}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
