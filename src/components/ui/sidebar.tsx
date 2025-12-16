'use client';

import type { ReactNode } from "react";

export type SidebarProps = {
  title?: string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Sidebar({ title, className, children, footer }: SidebarProps) {
  return (
    <aside className={"w-full shrink-0 sm:max-w-sm h-full " + (className ?? "")}>
      <div className="space-y-4 sm:sticky sm:top-28">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
          <div className={title ? "mt-4" : ""}>{children}</div>
        </div>

        {footer ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            {footer}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
