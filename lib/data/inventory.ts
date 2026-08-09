// OFFLINE FALLBACK — values are intentionally zero. Real data comes from backend.
import type { InventoryItem, Product, RecommendationKind, StockStatus } from "@/lib/types";
import { dateInDays, daysAgo } from "./helpers";

/**
 * Compact seed rows: [name, brand, sku, unit, unitPrice, qty, reorderPoint,
 * velocityPerDay, expiryDays, idleDays, batchCode]
 * Status is derived so the counts match the design spec exactly:
 * 8 CRITICAL · 14 WARNING · 15 UPCOMING · 4 SAFE · 2 DEAD_STOCK · 2 OVERSTOCK
 */
type Row = [string, string, string, string, number, number, number, number, number, number, string];

const rows: Row[] = [
  // ── CRITICAL (expiry ≤ 3) ────────────────────────────────────────────
  ["Britannia Bread", "Britannia", "BR-BRD-400", "400g", 40, 14, 6, 6.5, 2, 14, "B2289"],
  ["Nestle Milk", "Nestle", "NS-MLK-1L", "1L", 32, 22, 10, 8, 3, 18, "B2294"],
  ["Mother Dairy Curd", "Mother Dairy", "MD-CRD-500", "500g", 45, 18, 8, 4, 1, 9, "B2301"],
  ["Amul Butter", "Amul", "AM-BUT-500", "500g", 175, 9, 8, 3.2, 2, 12, "B2278"],
  ["Amul Cheese", "Amul", "AM-CHS-200", "200g", 120, 12, 6, 2.4, 3, 11, "B2261"],
  ["Britannia Cake", "Britannia", "BR-CAK-200", "200g", 30, 16, 8, 3, 2, 10, "B2292"],
  ["Lays Chips", "PepsiCo", "LY-CHP-52", "52g", 20, 40, 24, 6, 3, 8, "B2286"],
  ["Amul Lassi", "Amul", "AM-LSS-180", "180ml", 25, 24, 12, 5, 2, 7, "B2305"],
  // ── WARNING (4–15) ──────────────────────────────────────────────────
  ["Parle-G", "Parle", "PL-G-500", "500g", 35, 7, 10, 3.5, 8, 5, "B2255"],
  ["Horlicks", "HUL", "HL-HRK-1K", "1kg", 280, 11, 8, 1.2, 12, 30, "B2241"],
  ["Amul Ghee", "Amul", "AM-GHE-500", "500ml", 320, 9, 6, 0.8, 14, 40, "B2229"],
  ["Tata Salt", "Tata", "TT-SLT-1K", "1kg", 28, 28, 15, 4, 10, 16, "B2259"],
  ["Maggi Noodles", "Nestle", "MG-NDL-70", "70g", 14, 35, 25, 9, 9, 4, "B2271"],
  ["Saffola Oil", "Marico", "SF-OIL-1L", "1L", 145, 15, 8, 1.8, 11, 22, "B2238"],
  ["Bournvita", "Mondelez", "BV-500", "500g", 220, 8, 6, 1.1, 7, 15, "B2247"],
  ["Colgate", "Colgate", "CG-PST-100", "100g", 55, 20, 12, 2.2, 15, 26, "B2233"],
  ["Dove Soap", "HUL", "DV-SOP-100", "100g", 62, 30, 18, 3, 13, 20, "B2251"],
  ["Aashirvaad Atta", "ITC", "AS-ATT-5K", "5kg", 265, 12, 6, 1.5, 9, 17, "B2263"],
  ["Mother Dairy Paneer", "Mother Dairy", "MD-PNR-200", "200g", 95, 10, 6, 2, 6, 6, "B2302"],
  ["Amul Kool", "Amul", "AM-KOL-200", "200ml", 20, 26, 14, 6, 5, 5, "B2287"],
  ["Britannia Marie", "Britannia", "BR-MAR-250", "250g", 35, 18, 10, 2.8, 12, 14, "B2268"],
  ["Dabur Honey", "Dabur", "DB-HNY-500", "500g", 185, 6, 4, 0.5, 14, 21, "B2244"],
  // ── UPCOMING (16–30) ────────────────────────────────────────────────
  ["Fortune Oil", "Adani", "FT-OIL-1L", "1L", 150, 24, 8, 1.6, 22, 25, "B2214"],
  ["Red Label Tea", "Tata", "RL-TEA-250", "250g", 145, 19, 8, 2.1, 25, 19, "B2219"],
  ["Nescafe", "Nestle", "NC-CFE-50", "50g", 105, 14, 6, 1.4, 20, 23, "B2225"],
  ["Kissan Jam", "HUL", "KS-JAM-500", "500g", 95, 9, 5, 0.9, 28, 31, "B2207"],
  ["Amul Mithai Mate", "Amul", "AM-MMT-300", "300g", 42, 13, 6, 1.2, 18, 12, "B2231"],
  ["Britannia Milk Bikis", "Britannia", "BR-MBK-200", "200g", 25, 22, 12, 2.5, 24, 20, "B2221"],
  ["Ponds Powder", "HUL", "PN-PWD-100", "100g", 135, 8, 4, 0.6, 30, 33, "B2198"],
  ["Surf Excel", "HUL", "SF-EXL-1K", "1kg", 150, 16, 6, 1.1, 26, 28, "B2216"],
  ["Dettol Soap", "Reckitt", "DT-SOP-75", "75g", 42, 25, 12, 2.4, 19, 17, "B2236"],
  ["Sunfeast Marie", "ITC", "SF-MAR-250", "250g", 30, 17, 8, 2, 21, 22, "B2224"],
  ["Amul Taaza", "Amul", "AM-TZA-500", "500ml", 28, 30, 14, 7, 17, 6, "B2290"],
  ["Haldiram Namkeen", "Haldiram", "HD-NMK-150", "150g", 35, 12, 6, 1.3, 23, 18, "B2217"],
  ["Pepsodent", "HUL", "PS-DNT-150", "150g", 65, 15, 8, 1.5, 27, 29, "B2203"],
  ["Whisper", "P&G", "WS-PAD-40", "40 pads", 120, 7, 5, 0.7, 29, 24, "B2195"],
  ["Bourbon Biscuit", "Britannia", "BR-BBN-200", "200g", 30, 20, 10, 2.2, 16, 13, "B2237"],
  // ── SAFE (31+) ──────────────────────────────────────────────────────
  ["Tata Tea Gold", "Tata", "TT-TGL-500", "500g", 245, 18, 8, 1.3, 120, 30, "B2101"],
  ["Aashirvaad Besan", "ITC", "AS-BSN-1K", "1kg", 120, 14, 6, 1.2, 180, 41, "B2055"],
  ["Patanjali Ghee", "Patanjali", "PT-GHE-1L", "1L", 480, 10, 5, 0.8, 240, 52, "B2010"],
  ["Maggi Masala Pouch", "Nestle", "MG-MSL-200", "200g", 25, 40, 20, 8, 160, 15, "B2077"],
  // ── DEAD STOCK (velocity 0, idle > 60) ──────────────────────────────
  ["Cerelac", "Nestle", "CR-LAC-300", "300g", 190, 6, 4, 0, 60, 75, "B1980"],
  ["Tang Orange", "Mondelez", "TG-ORN-1K", "1kg", 140, 5, 4, 0, 90, 66, "B1924"],
  // ── OVERSTOCK (>3 months of supply) ─────────────────────────────────
  ["Coca Cola", "Coca-Cola", "CC-COL-750", "750ml", 45, 96, 24, 0.8, 180, 9, "B2022"],
  ["Amul Kool 1L", "Amul", "AM-KOL-1L", "1L", 45, 72, 18, 0.6, 150, 8, "B2036"],
];

function classify(velocity: number, qty: number, expiryDays: number, idleDays: number): StockStatus {
  if (velocity === 0 && idleDays > 60) return "DEAD_STOCK";
  if (velocity > 0 && qty / (velocity * 30) > 3) return "OVERSTOCK";
  if (expiryDays <= 3) return "CRITICAL";
  if (expiryDays <= 15) return "WARNING";
  if (expiryDays <= 30) return "UPCOMING";
  return "SAFE";
}

function pickAiKind(status: StockStatus, index: number): RecommendationKind | null {
  if (status === "CRITICAL") return index % 3 === 0 ? "TRANSFER" : "DISCOUNT";
  if (status === "WARNING") return "DISCOUNT";
  if (status === "OVERSTOCK") return "TRANSFER";
  if (status === "DEAD_STOCK") return "SUPPLIER_RETURN";
  return null;
}

export const inventory: InventoryItem[] = rows.map((row, index) => {
  const [name, brand, sku, unit, unitPrice, qty, reorderPoint, velocity, expiryDays, idleDays, batchCode] = row;
  const id = `inv-${index + 1}`;
  const product: Product = {
    id: `p-${index + 1}`,
    sku,
    name,
    brand,
    category: "FMCG",
    unit,
    unitPrice: 0,
    status: classify(velocity, qty, expiryDays, idleDays),
    currentQty: qty,
    reorderPoint,
    velocityPerDay: velocity,
  };
  const estLeftover = velocity === 0 ? qty : Math.max(0, Math.round(qty - velocity * expiryDays));
  return {
    id,
    product,
    batch: {
      id: `b-${index + 1}`,
      productId: product.id,
      batchCode,
      receivedAt: daysAgo(idleDays),
      qty,
      expiryDate: dateInDays(expiryDays),
    },
    expiryDays,
    estLeftover,
    riskValue: 0,
    aiKind: pickAiKind(product.status, index),
  };
});
