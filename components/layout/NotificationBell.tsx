"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  selectUnreadCount,
  useNotificationStore,
} from "@/stores/useNotificationStore";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useNotificationStore(selectUnreadCount);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring relative rounded-xl border border-line bg-surface/60 p-2.5 text-muted transition-colors hover:text-ink"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      <NotificationDropdown open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
