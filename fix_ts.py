import re

# 1. Fix lib/api.ts
with open('lib/api.ts', 'r', encoding='utf-8') as f:
    api_content = f.read()

target = """export async function getGreenScoreCurrent(): Promise<GreenScoreOut> {
  return liveOr(
    () => apiFetch<GreenScoreOut>("/api/green-score/current"),
    () => ({ score: 84, expiry_score: 80, inventory_score: 85, dead_stock_score: 82, waste_score: 88, breakdown: [], period_date: "" })
  );
}

export async function getGreenScoreHistory(): Promise<GreenScoreHistoryPoint[]> {
  return liveOr(
    () => apiFetch<GreenScoreHistoryPoint[]>("/api/green-score/history"),
    () => []
  );
}"""

api_content = api_content.replace(target, "")

with open('lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(api_content)

# 2. Fix app/dashboard/sustainability/page.tsx
sus_path = 'app/dashboard/sustainability/page.tsx'
with open(sus_path, 'r', encoding='utf-8') as f:
    sus_content = f.read()

sus_content = sus_content.replace('bg: "bg-emerald-50" }', 'bg: "bg-emerald-50", change: "+0%" }')
sus_content = sus_content.replace('bg: "bg-blue-50" }', 'bg: "bg-blue-50", change: "+0%" }')
sus_content = sus_content.replace('bg: "bg-amber-50" }', 'bg: "bg-amber-50", change: "+0%" }')
sus_content = sus_content.replace('bg: "bg-[#0FA958]/10" }', 'bg: "bg-[#0FA958]/10", change: "+0%" }')

with open(sus_path, 'w', encoding='utf-8') as f:
    f.write(sus_content)

print("Fixed api.ts and sustainability page.")
