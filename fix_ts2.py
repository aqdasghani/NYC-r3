import re

with open('lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix getFeaturedRisk return type
content = content.replace('export async function getFeaturedRisk(): Promise<FeaturedRisk> {', 'export async function getFeaturedRisk(): Promise<FeaturedRisk | null> {')

# Make sure getGreenScoreCurrent and getGreenScoreHistory exist.
if 'export async function getGreenScoreCurrent' not in content:
    content += """
export async function getGreenScoreCurrent(): Promise<GreenScoreOut> {
  return liveOr(
    () => apiFetch<GreenScoreOut>("/api/green-score/current"),
    () => ({ score: 84, expiry_score: 80, inventory_score: 85, dead_stock_score: 82, waste_score: 88, breakdown: [], period_date: "" })
  );
}

export async function getGreenScoreHistory(days: number = 30): Promise<GreenScoreHistoryPoint[]> {
  return liveOr(
    () => apiFetch<GreenScoreHistoryPoint[]>(`/api/green-score/history?days=${days}`),
    () => []
  );
}
"""

with open('lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
