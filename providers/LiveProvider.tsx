"use client";

import { useEffect, useRef } from "react";
import { dashboardWsUrl, ensureAuth } from "@/lib/api-client";
import { emitLive, type LiveEvent } from "@/lib/live";

const RECONNECT_DELAY_MS = 4000;

/**
 * Opens the store-scoped dashboard WebSocket and forwards every backend event
 * to `lib/live.ts` subscribers. Reconnects with backoff; never throws — if the
 * backend is down the UI simply runs on mock/local data.
 */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;

    const connect = async () => {
      if (disposed) return;
      const authed = await ensureAuth();
      if (disposed || !authed) {
        scheduleReconnect();
        return;
      }

      const ws = new WebSocket(dashboardWsUrl());
      socketRef.current = ws;

      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(String(msg.data)) as LiveEvent;
          emitLive(event);
        } catch {
          // Non-JSON or malformed frame — ignore.
        }
      };
      ws.onclose = () => scheduleReconnect();
      ws.onerror = () => ws.close();
    };

    const scheduleReconnect = () => {
      if (disposed || timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void connect();
      }, RECONNECT_DELAY_MS);
    };

    void connect();
    return () => {
      disposed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      socketRef.current?.close();
    };
  }, []);

  return <>{children}</>;
}
