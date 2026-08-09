import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { SidebarProvider } from "@/components/dashboard/SidebarContext";
import { AiChatbotModal } from "@/components/ai/AiChatbotModal";
import { Toaster } from "@/components/ui/Toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-canvas font-sans text-ink">
        <Sidebar />
        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
      <AiChatbotModal />
      <Toaster />
    </SidebarProvider>
  );
}
