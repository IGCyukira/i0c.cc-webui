'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type EditorMode = "rules" | "json";

export type RightPanelProps = {
  editorMode: EditorMode;
  onEnterRulesMode: () => void;
  onEnterJsonMode: () => void;
  jsonDraft: string;
  onJsonDraftChange: (value: string) => void;
  jsonError: string | null;
  rulesContent: ReactNode;
};

export function RightPanel({
  editorMode,
  onEnterRulesMode,
  onEnterJsonMode,
  jsonDraft,
  onJsonDraftChange,
  jsonError,
  rulesContent,
}: RightPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeLine, setActiveLine] = useState(1);

  const lineHeightPx = 20;
  const paddingTopPx = 12;

  const lineCount = useMemo(() => Math.max(1, jsonDraft.split("\n").length), [jsonDraft]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [lineCount]);

  const jsonFormatError = useMemo(() => {
    if (editorMode !== "json") {
      return null;
    }
    if (jsonDraft.trim() === "") {
      return null;
    }
    try {
      JSON.parse(jsonDraft);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      return `JSON 格式错误：${message}`;
    }
  }, [editorMode, jsonDraft]);

  const updateActiveLineFromSelection = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    const selectionStart = element.selectionStart ?? 0;
    let line = 1;
    for (let index = 0; index < selectionStart && index < jsonDraft.length; index += 1) {
      if (jsonDraft.charCodeAt(index) === 10) {
        line += 1;
      }
    }
    const clamped = Math.min(Math.max(1, line), lineCount);
    setActiveLine(clamped);
  }, [jsonDraft, lineCount]);

  const autosizeTextarea = () => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    const nextHeight = element.scrollHeight;
    element.style.height = `${nextHeight + 2}px`;
  };

  useLayoutEffect(() => {
    if (editorMode !== "json") {
      return;
    }

    autosizeTextarea();
    const frame = requestAnimationFrame(() => {
      autosizeTextarea();
      updateActiveLineFromSelection();
    });
    return () => cancelAnimationFrame(frame);
  }, [editorMode, jsonDraft, updateActiveLineFromSelection]);

  const highlightTop = paddingTopPx + (activeLine - 1) * lineHeightPx;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={onEnterRulesMode}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
              (editorMode === "rules" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50")
            }
          >
            规则编辑
          </button>
          <button
            type="button"
            onClick={onEnterJsonMode}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
              (editorMode === "json" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50")
            }
          >
            JSON 编辑
          </button>
        </div>
        <p className="text-xs text-slate-500">{editorMode === "json" ? "保存将以此 JSON 为准" : "编辑规则并保存"}</p>
      </div>

      {editorMode === "json" ? (
        <div className="space-y-3">
          {jsonError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {jsonError}
            </div>
          ) : null}

          {jsonFormatError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {jsonFormatError}
            </div>
          ) : null}

          <div
            className={
              "flex w-full rounded-2xl border bg-white focus-within:border-slate-300 overflow-hidden " +
              (jsonFormatError ? "border-amber-200" : jsonError ? "border-rose-200" : "border-slate-200")
            }
          >
            <div className="select-none border-r border-slate-200 bg-white px-3 py-3 text-right font-mono text-xs leading-5 text-slate-400">
              {lineNumbers.map((line) => (
                <div
                  key={line}
                  className={
                    "h-5 " +
                    (line === activeLine ? "bg-slate-100 text-slate-600" : "text-slate-400")
                  }
                >
                  {line}
                </div>
              ))}
            </div>

            <div className="relative min-w-0 flex-1 bg-white">
              <div
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 bg-slate-50"
                style={{ top: highlightTop, height: lineHeightPx }}
              />
              <textarea
                ref={textareaRef}
                value={jsonDraft}
                onChange={(e) => {
                  onJsonDraftChange(e.target.value);
                  autosizeTextarea();
                  updateActiveLineFromSelection();
                }}
                onSelect={updateActiveLineFromSelection}
                onKeyUp={updateActiveLineFromSelection}
                onMouseUp={updateActiveLineFromSelection}
                onFocus={updateActiveLineFromSelection}
                spellCheck={false}
                className="relative z-10 min-h-[60vh] min-w-0 w-full whitespace-pre bg-transparent px-3 py-3 font-mono text-xs leading-5 text-slate-900 outline-none resize-none overflow-x-auto overflow-y-hidden"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">提示：切回“规则编辑”后会以解析后的内容为准。</p>
        </div>
      ) : (
        rulesContent
      )}
    </div>
  );
}
