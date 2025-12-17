'use client';

import { useCallback, useState } from "react";

import { AppHeader } from "@/components/ui/app-header";
import { RedirectsGroupsManager } from "@/components/redirects-groups";

export function RedirectsGroupsPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        mobileSidebarToggle={{
          isOpen: mobileSidebarOpen,
          onToggle: toggleMobileSidebar,
        }}
      />
      <RedirectsGroupsManager
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileSidebarOpenChange={setMobileSidebarOpen}
      />
    </div>
  );
}
