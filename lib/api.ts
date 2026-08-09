import type {
  AppNotification,
  DashboardData,
  ExecutedAction,
  FeaturedRisk,
  InventoryItem,
  KPI,
  Recommendation,
  Risk,
  ScoreData,
} from "@/lib/types";
import {
  featuredRisk,
  inventory,
  kpis,
  notifications,
  priorities,
  recentActions,
  recommendations,
  scoreData,
} from "@/lib/data";

/**
 * Data-access facade. Components and server pages ONLY import from here.
 *
 * To wire the real FastAPI backend, replace each function body with:
 *   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/<endpoint>`);
 *   return res.json();
 * Signatures stay identical — zero component churn.
 */

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));

export async function getDashboardData(): Promise<DashboardData> {
  await delay();
  return { kpis, priorities, score: scoreData };
}

export async function getKPIs(): Promise<KPI[]> {
  await delay();
  return kpis;
}

export async function getPriorities(): Promise<Risk[]> {
  await delay();
  return priorities;
}

export async function getGreenScore(): Promise<ScoreData> {
  await delay();
  return scoreData;
}

export async function getInventory(): Promise<InventoryItem[]> {
  await delay(220);
  return inventory;
}

export async function getFeaturedRisk(): Promise<FeaturedRisk> {
  await delay();
  return featuredRisk;
}

export async function getRecommendations(): Promise<Recommendation[]> {
  await delay();
  return recommendations;
}

export async function getRecentActions(): Promise<ExecutedAction[]> {
  await delay();
  return recentActions;
}

export async function getNotifications(): Promise<AppNotification[]> {
  await delay();
  return notifications;
}
