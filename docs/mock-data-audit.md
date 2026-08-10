# GreenShop AI — Mock Data & Production Separation Audit

| File | Component / Module | Mock / Fallback Data | Production Impact | Replacement / Isolation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `lib/data/index.ts` | Static mock dataset | Hardcoded KPIs (`mockKpis`), products, inventory, priorities, green score (84/100). | Used as default fallback when API calls fail or offline. | Isolated exclusively for **Demo Mode** (`/demo`). Production returns empty state / real DB responses. |
| `lib/api.ts` | `getSalesTrend()` | Random Math calculations: `Math.floor(Math.random() * 5000) + 1000`. | Generates fake sales trend graphs if sales history is empty. | Production returns `[]` (triggering "No sales recorded yet" UI state). Demo mode uses deterministic seed data. |
| `lib/api.ts` | `mockDashboardSummary()` | Hardcoded counts (37 at risk, 8 expired, 192 dead stock) and random trend line. | Fakes dashboard summary when API fails. | Production mode relies on backend DB `/api/analytics/dashboard` API; returns empty summary state when empty. |
| `lib/api.ts` | `getGreenScoreCurrent()` | Hardcoded `score: 84, expiry_score: 80...` fallback. | Shows fake score of 84 when DB has no green score history. | Production returns real calculation from `/api/green-score/current` or null/0 with empty state explanation. |
| `backend/app/integrations/ocr_service.py` | `extract_invoice_text()` | Hardcoded invoice line items (Amul Butter, Mother Dairy Curd, Britannia Bread). | Returned when `GEMINI_API_KEY` is not set or Gemini API fails. | Retained only as a deterministic mock fallback for offline demo; production logs OCR status cleanly and prompts user. |
| `backend/app/integrations/whatsapp_service.py` | `send_whatsapp_notification()` | Returns `{"sent": False, "mode": "mock"}`. | Simulated WhatsApp dispatch. | Explicitly logged as simulated dispatch mode until Meta WhatsApp Cloud API credentials are configured in production `.env`. |
| `components/dashboard/TopHeader.tsx` | Profile Avatar | Hardcoded "Rahul — Store owner" / "RG" avatar fallback. | Displays default user avatar when user name is loaded. | Dynamic user initials computed from current authenticated user context. |
| `components/dashboard/Sidebar.tsx` | Green Score Widget | Hardcoded gauge initial ring values (84/100, +7 this month). | Static sidebar widget score. | Connected to dynamic `useDashboardData()` / API Green Score response. |

## Classification Legend
- **Production Mode**: Uses REAL DB queries (`/api/*`), REAL calculations, strict empty states when data is 0/empty.
- **Demo Mode**: Explicitly accessible via `/demo` or Demo toggle banner (`🟡 DEMO MODE`), powered by synthetic seed dataset.
- **Tests**: Automated unit/integration tests in `backend/tests` use isolated SQLite test DB session.
