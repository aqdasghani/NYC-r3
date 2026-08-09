// OFFLINE FALLBACK — all values are zero; real data comes from backend.
import type { KPI } from '@/lib/types';

export const kpis: KPI[] = [
  { id: 'inv_value', label: 'Inventory Value', value: 0, unit: 'inr', deltaPct: 0, spark: [], icon: '📦', accent: 'accent' },
  { id: 'total_products', label: 'Total Products', value: 0, unit: 'number', deltaPct: 0, spark: [], icon: '🏷️', accent: 'ink' },
  { id: 'at_risk', label: 'At Risk', value: 0, unit: 'inr', deltaPct: 0, spark: [], icon: '⚠️', accent: 'warning' },
  { id: 'waste_prevented', label: 'Waste Prevented', value: 0, unit: 'inr', deltaPct: 0, spark: [], icon: '🌱', accent: 'safe' },
];
