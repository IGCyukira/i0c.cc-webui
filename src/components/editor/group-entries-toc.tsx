'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { RedirectGroup } from "@/composables/redirects-groups/model";

export function getRuleAnchorId(entry: RedirectGroup["entries"][0]) {
  if (!entry.key || entry.key.trim() === "") {
    return `rule-${entry.id}`;
  }
  return "rule-" + entry.key.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

type GroupEntriesTOCProps = {
  entries: RedirectGroup["entries"];
};

export function GroupEntriesMobileTOC({ entries }: GroupEntriesTOCProps) {
  const t = useTranslations("editor");
  const [isOpen, setIsOpen] = useState(false);
  
  const navItems = entries.map((entry) => ({
    id: getRuleAnchorId(entry),
    label: entry.key || "(Empty)",
    originalId: entry.id
  }));

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  if (navItems.length === 0) return null;

  return (
    <div className="lg:hidden sticky top-0 z-20 -mx-4 -mt-0 mb-6">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("onThisPage")}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {navItems.length}
            </span>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full max-h-[60vh] overflow-y-auto border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xl">
            <nav className="flex flex-col p-2">
              {navItems.map((item) => (
                <a
                  key={item.originalId}
                  href={`#${item.id}`}
                  onClick={handleLinkClick}
                  className="block rounded-lg px-4 py-2.5 text-sm font-mono text-slate-600 hover:bg-slate-100 hover:text-slate-900 truncate"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[-1] bg-black/5 h-screen mt-10" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function GroupEntriesDesktopTOC({ entries }: GroupEntriesTOCProps) {
  const t = useTranslations("editor");
  
  const navItems = entries.map((entry) => ({
    id: getRuleAnchorId(entry),
    label: entry.key || "(Empty)",
    originalId: entry.id
  }));

  if (navItems.length === 0) return null;

  return (
    <div className="border-l border-slate-200 pl-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {t("tableOfContents")} ({navItems.length})
      </h3>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <a
            key={item.originalId}
            href={`#${item.id}`}
            className="group flex items-start text-sm transition-colors hover:text-slate-900 text-slate-500"
          >
            <span className="truncate font-mono text-[13px] group-hover:underline decoration-slate-300 underline-offset-4">
              {item.label}
            </span>
          </a>
        ))}
      </nav>
    </div>
  );
}
