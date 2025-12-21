'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { QRCodeButton } from "@/components/ui/qr-code";

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="group relative flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 text-slate-400 cursor-help transition-colors hover:text-slate-600"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 opacity-0 transform scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto z-50">
          <div className="relative rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-xl leading-relaxed whitespace-pre-wrap text-center">
            {tooltip}
            <div className="absolute top-full left-1/2 -mt-1 -ml-1 h-2 w-2 border-4 border-transparent border-t-slate-800"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

type RouteMode = "string" | "object" | "array";
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
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
  if (Array.isArray(value)) return "array";
  if (isRecord(value)) return "object";
  return "string";
}

function createEmptyConfig(): Record<string, unknown> {
  return { type: "prefix", target: "", appendPath: true };
}

function getDestinationKey(config: Record<string, unknown>): DestinationKey {
  if (typeof config.target === "string") return "target";
  if (typeof config.to === "string") return "to";
  if (typeof config.url === "string") return "url";
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
  allowArray?: boolean;
  pathKey?: string; 
};

export function RouteEntryEditor({ value, onChange, level = 0, allowArray = true, pathKey = "" }: RouteEntryEditorProps) {
  const t = useTranslations("routeEntry");

  const mode = useMemo(() => getMode(value), [value]);

  const stringValue = mode === "string" ? asString(value) : "";
  const configValue = mode === "object" && isRecord(value) ? value : null;
  const arrayValue = mode === "array" && Array.isArray(value) ? value : null;

  const stringDraftRef = useRef<string>(stringValue);
  const objectDraftRef = useRef<Record<string, unknown> | null>(configValue);
  const arrayDraftRef = useRef<unknown[] | null>(arrayValue);

  useEffect(() => {
    if (mode === "string") stringDraftRef.current = stringValue;
  }, [mode, stringValue]);

  useEffect(() => {
    if (mode === "object" && configValue) objectDraftRef.current = configValue;
  }, [configValue, mode]);

  useEffect(() => {
    if (mode === "array" && arrayValue) arrayDraftRef.current = arrayValue;
  }, [arrayValue, mode]);

  const setMode = useCallback(
    (nextMode: RouteMode) => {
      if (nextMode === mode) return;
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
        if (arrayValue && arrayValue.length > 0) {
          const first = arrayValue[0];
          if (isRecord(first)) {
            const destinationKey = getDestinationKey(first);
            onChange(asString(first[destinationKey]));
            return;
          }
          onChange(asString(first));
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
        if (arrayValue && arrayValue.length > 0) {
          const first = arrayValue[0];
          if (isRecord(first)) {
            onChange(first);
            return;
          }
          const seed = createEmptyConfig();
          const seededConfig =
            asString(first).trim() === "" ? seed : setExclusiveDestination(seed, "target", asString(first).trim());
          onChange(seededConfig);
          return;
        }
        const seed = createEmptyConfig();
        const seededConfig =
          stringValue.trim() === "" ? seed : setExclusiveDestination(seed, "target", stringValue.trim());
        onChange(seededConfig);
        return;
      }
      if (nextMode === "array") {
        const cached = arrayDraftRef.current;
        if (cached && cached.length > 0) {
          onChange(cached);
          return;
        }
        if (arrayValue && arrayValue.length > 0) {
          onChange(arrayValue);
          return;
        }
        if (configValue) {
          onChange([configValue]);
          return;
        }
        if (stringValue.trim() !== "") {
          onChange([stringValue]);
          return;
        }
        onChange([""]);
        return;
      }
    },
    [arrayValue, configValue, mode, onChange, stringValue]
  );

  const containerClassName = level > 0 ? "mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" : "";

  return (
    <div className={containerClassName}>
      <div className="space-y-2">
        <span className="block text-xs font-medium text-slate-500">{t("ruleType")}</span>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("string")}
            className={
              "relative inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 " +
              (mode === "string"
                ? "bg-slate-900 text-white shadow-sm" 
                : "text-slate-700 hover:bg-slate-50") 
            }
          >
            {t("quick")}
          </button>

          <button
            type="button"
            onClick={() => setMode("object")}
            className={
              "relative inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 " +
              (mode === "object"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-50")
            }
          >
            {t("detail")}
          </button>

          {allowArray ? (
            <button
              type="button"
              onClick={() => setMode("array")}
              className={
                "relative inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 " +
                (mode === "array"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50")
              }
            >
              {t("multi")}
            </button>
          ) : (
            <div aria-hidden className="h-7" />
          )}
        </div>

      </div>

      {mode === "string" ? (
        <div className="mt-3">
          <LabelWithTooltip label={t("targetLabel")} tooltip={t("targetTooltip")} />
          <div className="flex gap-2">
            <input
              value={stringValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t("targetPlaceholder")}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
            />
            {pathKey && <QRCodeButton pathKey={pathKey} />}
          </div>
        </div>
      ) : null}

      {mode === "array" && arrayValue ? (
        <div className="mt-4 space-y-3">
          {arrayValue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">{t("noRuleItems")}</p>
            </div>
          ) : null}

          {arrayValue.map((item, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">{t("ruleItem", { index: index + 1 })}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(t("confirmDeleteRule"))) return;
                    const next = arrayValue.slice();
                    if (next.length <= 1) {
                      next[0] = "";
                      onChange(next);
                      return;
                    }
                    next.splice(index, 1);
                    onChange(next);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                  title={t("deleteRule")}
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
              <div className="mt-3">
                <RouteEntryEditor
                  value={Array.isArray(item) ? "" : item}
                  allowArray={false}
                  level={level + 1}
                  pathKey={pathKey} 
                  onChange={(nextItem) => {
                    const safeNext = Array.isArray(nextItem) ? "" : nextItem;
                    const next = arrayValue.slice();
                    next[index] = safeNext;
                    onChange(next);
                  }}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onChange([...(arrayValue ?? []), ""])}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
              <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("addRuleItem")}
          </button>
        </div>
      ) : null}

      {mode === "object" && configValue ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {(() => {
            const routeType = ((configValue.type as string | undefined) ?? "prefix").trim();
            const showAppendPath = routeType !== "exact";
            const showStatus = routeType !== "proxy";
            const detailCols = showStatus ? 3 : 2;
            const statusValue = normalizeStatus(configValue.status);
            const priorityValue = normalizePriority(configValue.priority);
            const statusInvalid = showStatus && statusValue.trim() !== "" && !/^\d{3}$/.test(statusValue.trim());
            const priorityInvalid = priorityValue.trim() !== "" && !/^-?\d+$/.test(priorityValue.trim());

            return (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <LabelWithTooltip label={t("typeLabel")} tooltip={t("typeTooltip")} />
                    <DropdownSelect
                      value={(configValue.type as string | undefined) ?? "prefix"}
                      onChange={(next) => {
                        const nextConfig: Record<string, unknown> = { ...configValue, type: next };
                        if (next === "proxy") delete nextConfig.status;
                        if (next === "exact") delete nextConfig.appendPath;
                        onChange(nextConfig);
                      }}
                      options={[
                        { value: "prefix", label: "prefix" },
                        { value: "exact", label: "exact" },
                        { value: "proxy", label: "proxy" },
                      ]}
                    />
                  </div>

                  {showAppendPath ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("appendPath")}</label>
                      <div className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-3 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={Boolean(configValue.appendPath)}
                          onChange={(e) => onChange({ ...configValue, appendPath: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                        />
                        <span className="text-sm text-slate-700">{t("appendPathHint")}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={"grid grid-cols-1 gap-2 " + (detailCols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                  <div className={detailCols === 3 ? "sm:col-span-3" : "sm:col-span-2"}>
                    <LabelWithTooltip label={t("targetLabel")} tooltip={t("targetTooltip")} />
                    <div className="flex gap-2">
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
                      {pathKey && <QRCodeButton pathKey={pathKey} />}
                    </div>
                  </div>

                  {showStatus ? (
                    <div>
                      <LabelWithTooltip label={t("statusLabel")} tooltip={t("statusTooltip")} />
                      <input
                        value={statusValue}
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
                        className={
                          "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300 " +
                          (statusInvalid ? "border-rose-300" : "border-slate-200")
                        }
                      />
                      {statusInvalid ? <p className="mt-1 text-xs text-rose-600">{t("statusInvalid")}</p> : null}
                    </div>
                  ) : null}

                  <div>
                    <LabelWithTooltip label={t("priorityLabel")} tooltip={t("priorityTooltip")} />
                    <input
                      value={priorityValue}
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
                      className={
                        "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300 " +
                        (priorityInvalid ? "border-rose-300" : "border-slate-200")
                      }
                    />
                    {priorityInvalid ? <p className="mt-1 text-xs text-rose-600">{t("priorityInvalid")}</p> : null}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}