"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboardData, getDashboardSummary } from "@/lib/api";
import { pingBackend } from "@/lib/api-client";
import { subscribeLive } from "@/lib/live";
import type { DashboardData } from "@/lib/types";
import type { DashboardSummary } from "@/lib/backend-types";

/** Backend events that should trigger a dashboard refetch. */
const REFRESH_EVENTS = new Set([
  "inventory_updated",
  "sale_recorded",
  "recommendation_updated",
  "recommendation_created",
]);

const EMPTY_DATA: DashboardData = {
  kpis: [],
  priorities: [],
  score: { score: 0, delta: 0, categories: [] },
};

export interface DashboardState extends DashboardData {
  summary: DashboardSummary | null;
  loading: boolean;
  offline: boolean;
  reload: () => void;
}

/**
 * Loads the dashboard from the live backend (with mock fallback) and refetches
 * whenever the WebSocket reports inventory/sales/recommendation changes.
 */
export function useDashboardData(): DashboardState {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const online = await pingBackend();
      if (cancelled) return;
      setOffline(!online);
      try {
        // Fetch the aggregate once and reuse it — getDashboardData accepts the
        // summary to avoid a second hit on the heavy /api/analytics/dashboard.
        const summaryRes = await getDashboardSummary();
        if (cancelled) return;
        const dataRes = await getDashboardData(summaryRes);
        if (cancelled) return;
        setSummary(summaryRes);
        setData(dataRes);
      } catch (e) {
        console.error("Failed to load dashboard", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const unsubscribe = subscribeLive((event) => {
      if (REFRESH_EVENTS.has(event.type)) reload();
    });
    return unsubscribe;
  }, [reload]);

  return { ...data, summary, loading, offline, reload };
}
