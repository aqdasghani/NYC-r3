import type { InvoiceDraft } from "@/lib/types";
import { dateInDays } from "./helpers";

/** The "magic moment" demo invoice — Amul GRN with 4 line items, 48 units. */
export const invoiceDraft: InvoiceDraft = {
  supplier: "Amul Distributors",
  invoiceNo: "INV-2026-8841",
  date: dateInDays(0),
  items: [
    {
      id: "inv-item-1",
      name: "Amul Butter",
      brand: "Amul",
      qty: 24,
      unit: "500g",
      batchCode: "B2284",
      expiryDate: dateInDays(5),
      unitPrice: 175,
      confidence: 98,
    },
    {
      id: "inv-item-2",
      name: "Amul Cheese",
      brand: "Amul",
      qty: 12,
      unit: "200g",
      batchCode: "B2291",
      expiryDate: dateInDays(21),
      unitPrice: 120,
      confidence: 95,
    },
    {
      id: "inv-item-3",
      name: "Amul Milk Powder",
      brand: "Amul",
      qty: 8,
      unit: "1kg",
      batchCode: "B2303",
      expiryDate: dateInDays(120),
      unitPrice: 540,
      confidence: 92,
    },
    {
      id: "inv-item-4",
      name: "Amul Ghee",
      brand: "Amul",
      qty: 4,
      unit: "500ml",
      batchCode: "B2297",
      expiryDate: dateInDays(200),
      unitPrice: 320,
      confidence: 90,
    },
  ],
};
