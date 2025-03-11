import { SettingsSidebar } from "@/components/settings-sidebar";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-full inline-flex w-full">
      <SettingsSidebar />
      <div className="flex-1 flex w-full rounded-xl bg-white shadow-border p-4 min-h-[60vh]">
        {children}
      </div>
    </div>
  );
}
