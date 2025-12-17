'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RouteMode = "string" | "object";
type DestinationKey = "target" | "to" | "url";

type DropdownOption = {
  value: string;
  label: string;
};

function DropdownSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (next: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={"relative " + (className ?? "")}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-left text-sm text-slate-900 outline-none focus:border-slate-300"
      >
        {selected?.label ?? value}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-60 overflow-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={
                    "w-full px-3 py-2 text-left text-sm " +
                    (isSelected
                      ? "bg-slate-50 font-medium text-slate-900"
                      : "text-slate-700 hover:bg-slate-50")
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

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

  const stringValue = mode === "string" ? asString(value) : "";
  const configValue = mode === "object" && isRecord(value) ? value : null;

  const stringDraftRef = useRef<string>(stringValue);
  const objectDraftRef = useRef<Record<string, unknown> | null>(configValue);

  useEffect(() => {
    if (mode === "string") {
      stringDraftRef.current = stringValue;
    }
  }, [mode, stringValue]);

  useEffect(() => {
    if (mode === "object" && configValue) {
      objectDraftRef.current = configValue;
    }
  }, [configValue, mode]);

  const setMode = useCallback(
    (nextMode: RouteMode) => {
      if (nextMode === mode) {
        return;
      }
      if (nextMode === "string") {
        const cached = stringDraftRef.current;
        if (cached.trim() !== "") {
          onChange(cached);
          return;
        }
        if (configValue) {
          const destinationKey = getDestinationKey(configValue);
          onChange(asString(configValue[destinationKey]));
          return;
        }
        onChange("");
        return;
      }
      if (nextMode === "object") {
        const cached = objectDraftRef.current;
        if (cached) {
          onChange(cached);
          return;
        }
        const seed = createEmptyConfig();
        const seededConfig =
          stringValue.trim() === "" ? seed : setExclusiveDestination(seed, "target", stringValue.trim());
        onChange(seededConfig);
        return;
      }
    },
    [configValue, mode, onChange, stringValue]
  );

  const containerClassName = level > 0 ? "mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" : "";

  return (
    <div className={containerClassName}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">规则类型</span>
        <button
          type="button"
          onClick={() => setMode("string")}
          className={
            "relative inline-flex items-center whitespace-nowrap rounded-lg border py-1 pl-3 pr-3 text-xs leading-none " +
            (mode === "string"
              ? "border-slate-300 bg-white text-slate-900 pr-7"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
          }
        >
          快速配置
          {mode === "string" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setMode("object")}
          className={
            "relative inline-flex items-center whitespace-nowrap rounded-lg border py-1 pl-3 pr-3 text-xs leading-none " +
            (mode === "object"
              ? "border-slate-300 bg-white text-slate-900 pr-7"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
          }
        >
          详细配置
          {mode === "object" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
      </div>

      {mode === "string" ? (
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600">目标地址</label>
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
              <label className="block text-xs font-medium text-slate-600">type（prefix前缀、exact精确、proxy反代）</label>
              <div className="mt-1">
                <DropdownSelect
                  value={(configValue.type as string | undefined) ?? "prefix"}
                  onChange={(next) => onChange({ ...configValue, type: next })}
                  options={[
                    { value: "prefix", label: "prefix" },
                    { value: "exact", label: "exact" },
                    { value: "proxy", label: "proxy" },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">appendPath</label>
              <div className="mt-1 inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-3 text-sm text-slate-900">
                <input
                  type="checkbox"
                  checked={Boolean(configValue.appendPath)}
                  onChange={(e) => onChange({ ...configValue, appendPath: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                <span className="text-sm text-slate-700">拼接余下路径</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-600">目标地址 （target、to、url作用都是一样的）</label>
              <div className="mt-1 flex gap-2">
                <DropdownSelect
                  className="w-28 shrink-0"
                  value={getDestinationKey(configValue)}
                  onChange={(next) => {
                    const nextKey = next as DestinationKey;
                    const currentKey = getDestinationKey(configValue);
                    const currentValue = asString(configValue[currentKey]);
                    onChange(setExclusiveDestination(configValue, nextKey, currentValue));
                  }}
                  options={[
                    { value: "target", label: "target" },
                    { value: "to", label: "to" },
                    { value: "url", label: "url" },
                  ]}
                />
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
              <label className="block text-xs font-medium text-slate-600">status（重定向状态码）</label>
              <input
                value={normalizeStatus(configValue.status)}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === "" ? undefined : raw;
                  const nextConfig = { ...configValue };
                  if (next === undefined) {
                    delete nextConfig.status;
                    onChange(nextConfig);
                    return;
                  }
                  onChange({ ...nextConfig, status: next });
                }}
                placeholder="301"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">priority（数字越小优先级越高）</label>
              <input
                value={normalizePriority(configValue.priority)}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === "" ? undefined : raw;
                  const nextConfig = { ...configValue };
                  if (next === undefined) {
                    delete nextConfig.priority;
                    onChange(nextConfig);
                    return;
                  }
                  onChange({ ...nextConfig, priority: next });
                }}
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
          </div>
        </div>
      ) : null}


    </div>
  );
}
