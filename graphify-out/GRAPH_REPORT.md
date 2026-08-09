# Graph Report - greenshop-ai  (2026-08-12)

## Corpus Check
- 245 files · ~113,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1755 nodes · 4148 edges · 138 communities (106 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fa7d785`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data/index.ts
- cn
- ai_intelligence.py
- math_engine.py
- schemas.py
- money.py
- deps.py
- test_detection_engine.py
- api.ts
- app/page.tsx
- api-client.ts
- test_expiry_engine.py
- User
- analytics.py
- insight_engine.py
- MemoryCache
- test_score_engine.py
- AiPriorities.tsx
- InvoiceWizard.tsx
- compilerOptions
- procurement.py
- action_engine.py
- ai_interpreter.py
- billing_engine.py
- backend-types.ts
- products/page.tsx
- reports.py
- behavior_engine.py
- formatINR
- dashboard/layout.tsx
- devDependencies
- llm_service.py
- auth.py
- whatsapp.py
- suppliers.py
- dependencies
- ai_memory.py
- database.py
- types.ts
- allocate
- ai_actions.py
- GlobalState.tsx
- Product
- main.py
- conftest.py
- tests/test_analytics.py
- layout/Sidebar.tsx
- useDashboardData.ts
- intelligence/page.tsx
- KPICard.tsx
- package.json
- green_score.py
- live.ts
- opportunities_for_store
- expiry_parser.py
- settings/page.tsx
- ConnectionManager
- data_quality.py
- test_whatsapp.py
- sales.py
- reports/page.tsx
- Settings
- test_ws.py
- refactor-css.js
- replace_classes.js
- AsciiBadge.tsx
- replace_motion.js
- README.md
- components/Sidebar.tsx
- FeatureCard.tsx
- ActionBadge.tsx
- AnimatedRing.tsx
- components/GlassCard.tsx
- test_production_e2e.py
- useUiStore.ts
- dexie-react-hooks
- eslint.config.mjs
- framer-motion
- @google/genai
- @hookform/resolvers
- jspdf
- lenis
- next
- next.config.ts
- react
- react-dom
- recharts
- zod
- vercel.json
- DivisionByZero
- NotificationDropdown.tsx
- returns/page.tsx
- CategoryBar.tsx
- Green Quant AI — Backend
- Green Quant AI — Final Production & System Audit
- test_receiving.py
- PosItemRequest
- transfers/page.tsx
- Green Quant AI — Production Verification Report & Audit
- InsufficientData
- test_procurement.py
- AGENTS.md
- rules/graphify.md
- workflows/graphify.md
- CLAUDE.md
- copilot-instructions.md
- ApiError

## God Nodes (most connected - your core abstractions)
1. `User` - 115 edges
2. `cn()` - 64 edges
3. `apiFetch()` - 46 edges
4. `Product` - 39 edges
5. `liveOr()` - 37 edges
6. `InventoryBatch` - 31 edges
7. `formatINR()` - 26 edges
8. `Base` - 24 edges
9. `process_sale()` - 21 edges
10. `_product_metrics()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `CopilotPage()` --calls--> `askCopilot()`  [EXTRACTED]
  app/dashboard/intelligence/copilot/page.tsx → lib/api.ts
- `ReportsPage()` --calls--> `apiFetch()`  [EXTRACTED]
  app/dashboard/reports/page.tsx → lib/api-client.ts
- `ConfidenceBar()` --calls--> `cn()`  [EXTRACTED]
  components/ui/ConfidenceBar.tsx → lib/utils.ts
- `BriefingPage()` --calls--> `getDashboardSummary()`  [EXTRACTED]
  app/dashboard/briefing/page.tsx → lib/api.ts
- `BehavioralHeatmapPage()` --calls--> `getAIHeatmap()`  [EXTRACTED]
  app/dashboard/intelligence/heatmap/page.tsx → lib/api.ts

## Import Cycles
- None detected.

## Communities (138 total, 32 thin omitted)

### Community 0 - "data/index.ts"
Cohesion: 0.12
Nodes (19): recentActions, dateInDays(), daysAgo(), hoursAgo(), classify(), inventory, pickAiKind(), Row (+11 more)

### Community 1 - "cn"
Cohesion: 0.07
Nodes (46): CopilotPage(), CopilotResponse, Message, SUGGESTED_QUESTIONS, INSIGHT_ICONS, TIMELINE_COLORS, Tone, PriorityItem() (+38 more)

### Community 2 - "ai_intelligence.py"
Cohesion: 0.15
Nodes (35): generate_briefing_narrative(), interpret_insight(), A one-paragraph morning briefing written from the real briefing numbers., Plain-language version of a single insight for the explanation UI., days_of_supply(), stockout_eta(), ask_copilot_endpoint(), CopilotRequest (+27 more)

### Community 3 - "math_engine.py"
Cohesion: 0.08
Nodes (33): basket_analysis(), calculateExpiryRisk(), _classify_product(), daily_sales_engine(), _data_quality(), hourly_pattern(), monthly_trend_engine(), price_response() (+25 more)

### Community 4 - "schemas.py"
Cohesion: 0.10
Nodes (38): BatchCreate, BatchOut, ConfirmedItem, ExpiryTimelineBucket, ExtractedItem, MonthlyReportOut, PosSaleItem, PosSaleRequest (+30 more)

### Community 5 - "money.py"
Cohesion: 0.12
Nodes (27): apply_discount(), apply_margin(), calculate_discount(), calculate_gst(), calculate_taxable_and_gst(), from_float_rupees(), from_paise(), get_rounding_policy() (+19 more)

### Community 6 - "deps.py"
Cohesion: 0.09
Nodes (28): get_current_user(), get_db(), Session, Shared FastAPI dependencies: DB session, current user, RBAC, financial…, Yield a DB session, closing it afterwards., Return, ReturnCreate, StockTransferCreate (+20 more)

### Community 7 - "test_detection_engine.py"
Cohesion: 0.13
Nodes (33): DeadStockRisk, detect_product_risks(), detect_risks(), ExpiryRisk, InventoryBatch, Product, Session, Rule-based risk detection and recommendation generation trigger. (+25 more)

### Community 8 - "api.ts"
Cohesion: 0.08
Nodes (61): InventoryPage(), ReorderRow, STATUS_LABELS, containerVariants, itemVariants, ProcurementPage(), SustainabilityPage(), actionToExecuted() (+53 more)

### Community 9 - "app/page.tsx"
Cohesion: 0.08
Nodes (22): metadata, metadata, metadata, metadata, metadata, metadata, metadata, AppMockupSection() (+14 more)

### Community 10 - "api-client.ts"
Cohesion: 0.16
Nodes (20): LoginPage(), SignupPage(), API_URL, apiUpload(), DEMO_CREDENTIALS, demoSession(), getCurrentUser(), getToken() (+12 more)

### Community 11 - "test_expiry_engine.py"
Cohesion: 0.24
Nodes (21): classify_batch(), days_remaining(), expected_leftover(), expiry_timeline(), get_at_risk_batches(), date, InventoryBatch, Session (+13 more)

### Community 12 - "User"
Cohesion: 0.15
Nodes (34): User, AtRiskItem, DeadStockItem, Page, ProductCreate, ProductUpdate, Mirror the ``products`` table exactly — the schema is the wire contract, so…, ReorderSuggestion (+26 more)

### Community 13 - "analytics.py"
Cohesion: 0.10
Nodes (42): AiInsight, Aggregate the six dashboard health segments from batch state., stock_health(), Session, waste_prevented_series(), waste_prevented_total(), ActionOut, AiInsight (+34 more)

### Community 14 - "insight_engine.py"
Cohesion: 0.13
Nodes (31): _basket_insight(), _best_hour_insight(), _data_quality_insight(), _dead_stock_insights(), _demand_insights(), _expiry_insights(), generate_all_insights(), _insight() (+23 more)

### Community 15 - "MemoryCache"
Cohesion: 0.10
Nodes (17): ABC, Cache, clear_cache(), get_cache(), MemoryCache, Any, Cache abstraction with two interchangeable backends. - ``MemoryCache`` — in-…, Reset the singleton (used in tests). (+9 more)

### Community 16 - "test_score_engine.py"
Cohesion: 0.16
Nodes (28): generate_monthly_report(), Any, Session, Monthly Report Engine — Aggregates monthly sales, waste prevented, Green Score,…, Generate or refresh monthly summary for store_id and month_year (YYYY-MM)., calculate_green_score(), _clamp(), persist_history() (+20 more)

### Community 17 - "AiPriorities.tsx"
Cohesion: 0.22
Nodes (12): AiPriorities(), container, container, KpiGrid(), fadeUp, slideRight, stagger(), KPI (+4 more)

### Community 18 - "InvoiceWizard.tsx"
Cohesion: 0.15
Nodes (17): InvoiceWizard(), steps, StepAiRead(), StepConfirm(), StepDone(), StepUpload(), icons, WizardStepper() (+9 more)

### Community 19 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 20 - "procurement.py"
Cohesion: 0.16
Nodes (23): UUID, _store(), calculate_velocity(), Any, Session, Computes daily sales velocity over the past N days., reorder_quantity(), PurchaseOrder (+15 more)

### Community 21 - "action_engine.py"
Cohesion: 0.15
Nodes (23): build_prompt(), execute_action(), generate_recommendations(), Session, Recommendation generation and execution., Use configured LLM integration, falling back deterministically., Execute one approved plan and record the prevented waste impact., _rule_based_recommendations() (+15 more)

### Community 22 - "ai_interpreter.py"
Cohesion: 0.22
Nodes (26): _answer_best_day(), _answer_buy(), _answer_cross_sell(), _answer_dead_stock(), _answer_discount(), _answer_expiry(), _answer_health(), _answer_monthly() (+18 more)

### Community 23 - "billing_engine.py"
Cohesion: 0.17
Nodes (17): process_sale(), datetime, PosSaleRequest, Product, Session, UUID, Atomic POS transaction engine. Every sale is one database transaction: validate…, Atomic POS transaction with FEFO batch deduction and full sale persistence. (+9 more)

### Community 24 - "backend-types.ts"
Cohesion: 0.05
Nodes (40): OnboardSupplierPage(), SuppliersPage(), createSupplier(), deleteSupplier(), getSupplierSummary(), AiInsight, AiPriorityAction, AiPriorityActions (+32 more)

### Community 25 - "products/page.tsx"
Cohesion: 0.18
Nodes (19): CartItem, PosPage(), ProductsPage(), STATUS_LABELS, ScannerPage(), Stage, Tab, BarcodeScanner() (+11 more)

### Community 26 - "reports.py"
Cohesion: 0.15
Nodes (26): _date_range(), expiry_report(), gst_report(), inventory_report(), _parse_date(), procurement_report(), products_report(), profit_report() (+18 more)

### Community 27 - "behavior_engine.py"
Cohesion: 0.21
Nodes (22): associations(), _baskets(), discount_response(), full_behavior(), impulse_patterns(), _product_names(), Any, datetime (+14 more)

### Community 28 - "formatINR"
Cohesion: 0.21
Nodes (20): ActionsPage(), ActionTab, cardMeta(), planMeta(), TABS, AlertsPage(), planMeta(), AIInsight (+12 more)

### Community 29 - "dashboard/layout.tsx"
Cohesion: 0.10
Nodes (21): AiChatbotModal(), ChatMessage, MANDATORY_QUESTIONS, isActivePath(), NavGroup, navGroups, NavItem, Sidebar() (+13 more)

### Community 30 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+13 more)

### Community 31 - "llm_service.py"
Cohesion: 0.17
Nodes (19): _llm_answer(), Best-effort LLM rewrite of the grounded answer. Returns None on any failure., current_model(), _extract_json(), generate_json(), generate_recommendations(), has_llm(), _in_cooldown() (+11 more)

### Community 32 - "auth.py"
Cohesion: 0.07
Nodes (31): Any, Dependency factory — returns a dependency enforcing that the current user holds…, Deep-copy ``data`` (dict/list) with financial fields set to None. Used so STAFF…, redact_financials(), require_roles(), LoginRequest, RegisterRequest, TokenResponse (+23 more)

### Community 33 - "whatsapp.py"
Cohesion: 0.18
Nodes (17): classify_intent(), intent_response(), Any, WhatsApp Business API helpers, signature verification, and five intents., Send through Meta when configured; otherwise return a deterministic mock., send_message(), verify_signature(), verify_token() (+9 more)

### Community 34 - "suppliers.py"
Cohesion: 0.18
Nodes (22): PurchaseOrderItem, PurchaseOrderCreate, SupplierScorecardOut, SupplierSummaryOut, SupplierUpdate, create_purchase_order(), create_supplier(), delete_supplier() (+14 more)

### Community 35 - "dependencies"
Cohesion: 0.11
Nodes (19): clsx, date-fns, dexie, html5-qrcode, lucide-react, dependencies, clsx, date-fns (+11 more)

### Community 36 - "ai_memory.py"
Cohesion: 0.23
Nodes (15): _decision_dict(), list_decisions(), log_ai(), measure_outcome(), datetime, Session, UUID, AI memory and the recommendation feedback loop (AI spec §9, §10, §26). The AI… (+7 more)

### Community 37 - "database.py"
Cohesion: 0.12
Nodes (29): Application configuration via environment variables / .env file., Invoice OCR pipeline with Google Gemini Flash., lifespan(), BarcodeCatalog, Base, create_all(), drop_all(), Invoice (+21 more)

### Community 38 - "types.ts"
Cohesion: 0.14
Nodes (16): ToastState, improvementChecklist, scoreData, Batch, ChecklistItem, ExecutedAction, ExpiryTimelineBucket, KpiUnit (+8 more)

### Community 39 - "allocate"
Cohesion: 0.25
Nodes (13): allocate(), InsufficientStockError, date, First-Expired, First-Out allocation for POS sales., Allocate ``quantity`` units from active, non-expired batches in FEFO order.…, make_batch(), FEFO batch allocation unit tests., test_does_not_mutate_batches() (+5 more)

### Community 40 - "ai_actions.py"
Cohesion: 0.26
Nodes (13): ExecuteActionRequest, MessageOut, _action(), dismiss(), execute(), generate(), get_action(), list_actions() (+5 more)

### Community 41 - "GlobalState.tsx"
Cohesion: 0.15
Nodes (10): inter, metadata, AIInsight, Batch, defaultInsights, defaultProducts, GlobalStateContext, GlobalStateContextType (+2 more)

### Community 42 - "Product"
Cohesion: 0.10
Nodes (20): Lightweight demand forecasting primitives with cache-backed velocity., datetime, Product Opportunity Engine (AI spec §23). For every product we compute demand,…, _utcnow(), lookup_barcode(), Session, Barcode lookup seam. Camera decoding runs in the frontend; this service…, InventoryBatch (+12 more)

### Community 43 - "main.py"
Cohesion: 0.09
Nodes (31): AbstractEventLoop, extract_invoice_text(), OcrResult, parse_invoice(), Product, Use Gemini to extract structured JSON from the invoice image., health(), get (+23 more)

### Community 44 - "conftest.py"
Cohesion: 0.21
Nodes (13): client(), db(), manager_headers(), memdb(), owner_headers(), Pytest fixtures — isolated SQLite DB + one seeded TestClient per session.…, Seeded TestClient (app lifespan: create_all -> seed_if_empty)., A session to the seeded test DB for direct assertions. (+5 more)

### Community 46 - "layout/Sidebar.tsx"
Cohesion: 0.14
Nodes (13): BottomNav(), items, PageTransition(), insights, overview, Sidebar(), SidebarLink(), SidebarLinkProps (+5 more)

### Community 47 - "useDashboardData.ts"
Cohesion: 0.28
Nodes (8): DashboardPage(), DashboardSummary, DashboardState, EMPTY_DATA, REFRESH_EVENTS, useDashboardData(), DashboardData, formatCompactINR()

### Community 48 - "intelligence/page.tsx"
Cohesion: 0.14
Nodes (15): BehavioralHeatmapPage(), AIIntelligencePage(), BADGE_TONES, CLASS_BADGES, fetchWithAuth(), SalesDashboard(), TabItem, Tabs() (+7 more)

### Community 49 - "KPICard.tsx"
Cohesion: 0.16
Nodes (13): GreenScorePanel(), accentMap, KPICard(), CountUp(), CountUpProps, GlassCard(), GlassCardProps, GreenScoreRing() (+5 more)

### Community 50 - "package.json"
Cohesion: 0.18
Nodes (10): engines, node, name, private, scripts, build, dev, lint (+2 more)

### Community 51 - "green_score.py"
Cohesion: 0.32
Nodes (7): GreenScoreHistoryPoint, current(), history(), get, post, Green Score current value, history, and recalculation., recalculate()

### Community 52 - "live.ts"
Cohesion: 0.36
Nodes (7): dashboardWsUrl(), ensureAuth(), emitLive(), Listener, listeners, LiveEvent, LiveProvider()

### Community 53 - "opportunities_for_store"
Cohesion: 0.40
Nodes (5): _classify(), _expected_impact(), opportunities_for_store(), Any, Session

### Community 54 - "expiry_parser.py"
Cohesion: 0.33
Nodes (8): _parse_date(), parse_dates(), parse_expiry_fields(), parse_invoice_lines(), date, Invoice/label expiry extraction helpers. Patterns intentionally accept the…, Find the first explicit expiry date in arbitrary OCR text., Parse a simple line-oriented invoice into normalized dictionaries.

### Community 55 - "settings/page.tsx"
Cohesion: 0.25
Nodes (7): INITIAL_ROLES, INITIAL_USERS, PERMISSION_MODULES, PermissionNode, Role, SettingsPage(), UserType

### Community 56 - "ConnectionManager"
Cohesion: 0.39
Nodes (3): ConnectionManager, Any, WebSocket

### Community 57 - "data_quality.py"
Cohesion: 0.29
Nodes (5): combine(), confidence_score(), Public data-quality tiers — shared by every AI surface (§13 of the AI spec). An…, Map a data-quality tier to a conservative confidence percentage., Combines several tiers pessimistically: the weakest level wins.

### Community 59 - "sales.py"
Cohesion: 0.19
Nodes (14): PosSaleRequest, PosSaleResponse, BaseModel, POS sale schemas — canonical receipt/line shape shared by the backend, the…, Receipt, ReceiptLine, create_sale(), PosSaleRequest (+6 more)

### Community 60 - "reports/page.tsx"
Cohesion: 0.40
Nodes (3): formatINR(), ReportContent(), ReportsPage()

### Community 62 - "test_ws.py"
Cohesion: 0.40
Nodes (5): _owner_token(), WebSocket dashboard channel: a POS sale broadcasts live inventory events.…, Server must close the socket (4001), not hang, on an invalid token., test_ws_receives_broadcast_on_sale(), test_ws_rejects_bad_token()

### Community 63 - "refactor-css.js"
Cohesion: 0.33
Nodes (4): directoryPath, files, fs, path

### Community 64 - "replace_classes.js"
Cohesion: 0.33
Nodes (4): files, fs, path, replacements

### Community 66 - "replace_motion.js"
Cohesion: 0.40
Nodes (3): files, fs, path

### Community 67 - "README.md"
Cohesion: 0.12
Nodes (15): 1. Clone the repository, 2. Frontend Setup, 3. Backend Setup, 🧠 AI Business Intelligence, Backend & AI, ✨ Features, Frontend, 🚀 Getting Started (+7 more)

### Community 96 - "DivisionByZero"
Cohesion: 0.20
Nodes (15): apply_markup(), div_paise(), DivisionByZero, margin_pct(), markup_pct(), pct_of(), Divide two paise amounts, return Decimal rupees with 2 decimal places. Raises…, Safe division with explicit handling of zero denominator. Args: num: Numerator… (+7 more)

### Community 99 - "NotificationDropdown.tsx"
Cohesion: 0.27
Nodes (10): NotificationBell(), meta, NotificationDropdown(), useHydrated(), AppNotification, NotificationType, timeAgo(), NotificationState (+2 more)

### Community 101 - "returns/page.tsx"
Cohesion: 0.18
Nodes (7): BackendReturnOut, ReturnRecord, BackendMessage, Chat, Message, apiClient, Product

### Community 104 - "CategoryBar.tsx"
Cohesion: 0.24
Nodes (7): CategoryBar(), tintBar, tintText, ConfidenceBar(), ProgressBar(), ProgressBarProps, ScoreCategory

### Community 108 - "Green Quant AI — Backend"
Cohesion: 0.22
Nodes (8): Demo flow (the hackathon story), Demo logins (password `demo1234`), Green Quant AI — Backend, Project layout, Run, Setup, Stack, Tests

### Community 112 - "Green Quant AI — Final Production & System Audit"
Cohesion: 0.22
Nodes (8): 1. System Architecture, 2. UI/UX Design System Enforcement, 3. Real Backend & Database Engine Status, 4. Final Feature Matrix, 5. Final Verdict, Architecture Pipeline:, Green Quant AI — Final Production & System Audit, **🟢 PRODUCTION READY**

### Community 120 - "test_receiving.py"
Cohesion: 0.39
Nodes (6): Smart receiving: invoice OCR scan, then confirm (batch creation + detection)., _scan(), test_confirm_creates_batch_and_runs_detection(), test_scan_allows_worker_staff(), test_scan_denied_for_biller(), test_scan_invoice_returns_parsed_items()

### Community 121 - "PosItemRequest"
Cohesion: 0.43
Nodes (4): PosItemRequest, field_validator, model_validator, ValueError

### Community 122 - "transfers/page.tsx"
Cohesion: 0.33
Nodes (4): containerVariants, itemVariants, InventoryBatch, Store

### Community 123 - "Green Quant AI — Production Verification Report & Audit"
Cohesion: 0.40
Nodes (4): 1. Executive System Architecture Summary, 2. Verified Feature Matrix & Test Results, 3. End-to-End Verification Test Log Output, Green Quant AI — Production Verification Report & Audit

### Community 124 - "InsufficientData"
Cohesion: 0.67
Nodes (3): InsufficientData, Raised when a calculation cannot proceed due to missing/zero denominator., Exception

## Knowledge Gaps
- **252 isolated node(s):** `metadata`, `ActionTab`, `TABS`, `AIInsight`, `CopilotResponse` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `auth.py`, `whatsapp.py`, `ai_intelligence.py`, `suppliers.py`, `database.py`, `deps.py`, `ai_actions.py`, `main.py`, `analytics.py`, `green_score.py`, `procurement.py`, `reports.py`, `sales.py`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Product` connect `Product` to `ai_intelligence.py`, `math_engine.py`, `deps.py`, `test_detection_engine.py`, `test_expiry_engine.py`, `User`, `analytics.py`, `insight_engine.py`, `test_score_engine.py`, `procurement.py`, `action_engine.py`, `billing_engine.py`, `reports.py`, `behavior_engine.py`, `suppliers.py`, `ai_memory.py`, `database.py`, `ai_actions.py`, `main.py`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `InsufficientStockError` connect `allocate` to `PosItemRequest`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `metadata`, `ActionTab`, `TABS` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12433862433862433 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.07403846153846154 - nodes in this community are weakly interconnected._
- **Should `ai_intelligence.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14603174603174604 - nodes in this community are weakly interconnected._