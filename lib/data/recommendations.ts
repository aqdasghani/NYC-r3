import type { FeaturedRisk, Recommendation } from "@/lib/types";

export const featuredRisk: FeaturedRisk = {
  productName: "Amul Butter 500g",
  batchCode: "B2284",
  stock: 32,
  expiresDays: 6,
  velocity: 3.2,
  estLeftover: 13,
  riskValue: 5850,
};

export const recommendations: Recommendation[] = [
  {
    id: "rec-discount",
    kind: "DISCOUNT",
    title: "Discount 15%",
    description: "Clear ~22 units before expiry — markdown + front-shelf placement.",
    unitsCleared: 22,
    valueImpact: 4290,
    confidence: 87,
  },
  {
    id: "rec-transfer",
    kind: "TRANSFER",
    title: "Transfer 6 → Store #2",
    description: "Store #2 sells 5.1/day — it can absorb this batch faster than you.",
    unitsCleared: 6,
    valueImpact: 1560,
    confidence: 74,
    toStore: "Store #2",
  },
  {
    id: "rec-return",
    kind: "SUPPLIER_RETURN",
    title: "Supplier Return",
    description: "Return window closes tomorrow — recover full invoice value.",
    unitsCleared: 0,
    valueImpact: 1800,
    confidence: 91,
  },
];
