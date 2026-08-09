import type { AppNotification } from "@/lib/types";
import { hoursAgo } from "./helpers";

export const notifications: AppNotification[] = [
  {
    id: "n1",
    title: "AI Alert — Amul Butter",
    body: "32 units expiring in 6 days · ₹5,850 at risk",
    type: "danger",
    read: false,
    createdAt: hoursAgo(1),
  },
  {
    id: "n2",
    title: "Reorder Alert",
    body: "Parle-G 500g below reorder point (7 left)",
    type: "info",
    read: false,
    createdAt: hoursAgo(3),
  },
  {
    id: "n3",
    title: "Green Score Up!",
    body: "Score +2 — you prevented ₹1,240 of waste yesterday",
    type: "success",
    read: false,
    createdAt: hoursAgo(5),
  },
  {
    id: "n4",
    title: "Transfer Opportunity",
    body: "Store #2 can absorb 18 units of Amul Cheese",
    type: "info",
    read: true,
    createdAt: hoursAgo(26),
  },
  {
    id: "n5",
    title: "Supplier Return Window",
    body: "Horlicks 1kg return window closes tomorrow",
    type: "info",
    read: true,
    createdAt: hoursAgo(30),
  },
  {
    id: "n6",
    title: "Stockout Risk",
    body: "Tata Salt likely to stock out in ~4 days",
    type: "danger",
    read: true,
    createdAt: hoursAgo(50),
  },
];
