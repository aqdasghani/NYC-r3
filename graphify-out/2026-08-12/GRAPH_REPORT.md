# Graph Report - .  (2026-08-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1631 nodes · 3824 edges · 120 communities (89 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fa7d785`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- cn
- ai_intelligence.py
- math_engine.py
- schemas.py
- money.py
- main.py
- test_detection_engine.py
- api.ts
- app/page.tsx
- api-client.ts
- InventoryBatch
- User
- analytics.py
- insight_engine.py
- MemoryCache
- test_score_engine.py
- KpiGrid.tsx
- Button
- compilerOptions
- utils.ts
- action_engine.py
- ai_interpreter.py
- billing_engine.py
- backend-types.ts
- scanner/page.tsx
- reports.py
- behavior_engine.py
- actions/page.tsx
- dashboard/layout.tsx
- devDependencies
- llm_service.py
- auth.py
- whatsapp.py
- suppliers.py
- dependencies
- test_auth.py
- seed.py
- Toast.tsx
- allocate
- ai_actions.py
- GlobalState.tsx
- Product
- database.py
- conftest.py
- tests/test_analytics.py
- layout/Sidebar.tsx
- useDashboardData.ts
- intelligence/page.tsx
- KPICard.tsx
- package.json
- green_score.py
- live.ts
- opportunity_engine.py
- expiry_parser.py
- settings/page.tsx
- ConnectionManager
- data_quality.py
- test_whatsapp.py
- procurement/page.tsx
- reports/page.tsx
- config.py
- test_ws.py
- refactor-css.js
- replace_classes.js
- AsciiBadge.tsx
- replace_motion.js
- generate_monthly_report
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
- Product
- Product
- Product
- get
- BaseModel
- Recommendation

## God Nodes (most connected - your core abstractions)
1. `User` - 101 edges
2. `cn()` - 64 edges
3. `Product` - 41 edges
4. `InventoryBatch` - 37 edges
5. `liveOr()` - 33 edges
6. `apiFetch()` - 31 edges
7. `formatINR()` - 26 edges
8. `Base` - 24 edges
9. `process_sale()` - 21 edges
10. `_product_metrics()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `ConfidenceBar()` --calls--> `cn()`  [EXTRACTED]
  components/ui/ConfidenceBar.tsx → lib/utils.ts
- `ExpiryBadge()` --calls--> `cn()`  [EXTRACTED]
  components/ui/ExpiryBadge.tsx → lib/utils.ts
- `CopilotPage()` --calls--> `askCopilot()`  [EXTRACTED]
  app/dashboard/intelligence/copilot/page.tsx → lib/api.ts
- `BehavioralHeatmapPage()` --calls--> `getAIHeatmap()`  [EXTRACTED]
  app/dashboard/intelligence/heatmap/page.tsx → lib/api.ts
- `BriefingPage()` --calls--> `formatINR()`  [EXTRACTED]
  app/dashboard/briefing/page.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Communities (120 total, 31 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.06
Nodes (50): NotificationBell(), meta, NotificationDropdown(), greeting(), PAGE_META, today(), TopBar(), useHydrated() (+42 more)

### Community 1 - "cn"
Cohesion: 0.08
Nodes (40): CopilotPage(), CopilotResponse, Message, SUGGESTED_QUESTIONS, BehavioralHeatmapPage(), INSIGHT_ICONS, TIMELINE_COLORS, Tone (+32 more)

### Community 2 - "ai_intelligence.py"
Cohesion: 0.09
Nodes (52): generate_briefing_narrative(), interpret_insight(), A one-paragraph morning briefing written from the real briefing numbers., Plain-language version of a single insight for the explanation UI., _decision_dict(), list_decisions(), log_ai(), measure_outcome() (+44 more)

### Community 3 - "math_engine.py"
Cohesion: 0.08
Nodes (33): basket_analysis(), calculateExpiryRisk(), _classify_product(), daily_sales_engine(), _data_quality(), hourly_pattern(), monthly_trend_engine(), price_response() (+25 more)

### Community 4 - "schemas.py"
Cohesion: 0.08
Nodes (47): BatchOut, ConfirmedItem, ConfirmReceiptRequest, ConfirmReceiptResponse, DetectionRunSummary, ExecuteActionResponse, ExpiryTimelineBucket, ExtractedItem (+39 more)

### Community 5 - "money.py"
Cohesion: 0.08
Nodes (46): add_paise(), apply_discount(), apply_margin(), apply_markup(), calculate_discount(), calculate_gst(), calculate_taxable_and_gst(), div_paise() (+38 more)

### Community 6 - "main.py"
Cohesion: 0.07
Nodes (39): get_current_user(), get_db(), Session, Shared FastAPI dependencies: DB session, current user, RBAC, financial…, Yield a DB session, closing it afterwards., health(), get, GreenShop AI — FastAPI application factory and entry point. Boot sequence… (+31 more)

### Community 7 - "test_detection_engine.py"
Cohesion: 0.10
Nodes (40): AbstractEventLoop, DeadStockRisk, detect_product_risks(), detect_risks(), ExpiryRisk, Session, Rule-based risk detection and recommendation generation trigger., Run all detectors, persist new pending recommendations, return a summary. (+32 more)

### Community 8 - "api.ts"
Cohesion: 0.12
Nodes (41): AIIntelligencePage(), SustainabilityPage(), actionToExecuted(), actionToNotification(), actionToRecommendation(), actionToRisk(), actionTypeToKind(), askCopilot() (+33 more)

### Community 9 - "app/page.tsx"
Cohesion: 0.08
Nodes (22): metadata, metadata, metadata, metadata, metadata, metadata, metadata, AppMockupSection() (+14 more)

### Community 10 - "api-client.ts"
Cohesion: 0.07
Nodes (25): BackendReturnOut, ReturnRecord, containerVariants, itemVariants, BackendMessage, Chat, Message, LoginPage() (+17 more)

### Community 11 - "InventoryBatch"
Cohesion: 0.12
Nodes (32): classify_batch(), days_remaining(), expected_leftover(), expiry_timeline(), get_at_risk_batches(), date, Session, Expiry classification, risk queries, and timeline aggregation. (+24 more)

### Community 12 - "User"
Cohesion: 0.13
Nodes (37): calculate_velocity(), Any, Session, Computes daily sales velocity over the past N days., lookup_barcode(), Session, User, AtRiskItem (+29 more)

### Community 13 - "analytics.py"
Cohesion: 0.12
Nodes (35): AiInsight, Aggregate the six dashboard health segments from batch state., stock_health(), ActionOut, AiInsight, AiPriorityAction, AiPriorityActions, DailyBrief (+27 more)

### Community 14 - "insight_engine.py"
Cohesion: 0.13
Nodes (31): _basket_insight(), _best_hour_insight(), _data_quality_insight(), _dead_stock_insights(), _demand_insights(), _expiry_insights(), generate_all_insights(), _insight() (+23 more)

### Community 15 - "MemoryCache"
Cohesion: 0.10
Nodes (17): ABC, Cache, clear_cache(), get_cache(), MemoryCache, Any, Cache abstraction with two interchangeable backends. - ``MemoryCache`` — in-…, Reset the singleton (used in tests). (+9 more)

### Community 16 - "test_score_engine.py"
Cohesion: 0.18
Nodes (27): Monthly Report Engine — Aggregates monthly sales, waste prevented, Green Score,…, calculate_green_score(), _clamp(), persist_history(), Session, Green Score — transparent, non-scientific operational sustainability metric., score_dead_stock(), score_expiry_prevention() (+19 more)

### Community 17 - "KpiGrid.tsx"
Cohesion: 0.10
Nodes (19): CategoryBar(), tintBar, tintText, GreenScorePanel(), KPICard(), container, KpiGrid(), PageTransition() (+11 more)

### Community 18 - "Button"
Cohesion: 0.14
Nodes (20): InvoiceWizard(), steps, StepAiRead(), StepConfirm(), StepDone(), StepUpload(), icons, WizardStepper() (+12 more)

### Community 19 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 20 - "utils.ts"
Cohesion: 0.13
Nodes (21): BriefingPage(), MOCK_INSIGHTS, MOCK_METRICS, MOCK_PRIORITIES, DashboardPage(), fetchWithAuth(), SalesDashboard(), ExplainModalProps (+13 more)

### Community 21 - "action_engine.py"
Cohesion: 0.14
Nodes (24): build_prompt(), execute_action(), generate_recommendations(), Session, Recommendation generation and execution., Use configured LLM integration, falling back deterministically., Execute one approved plan and record the prevented waste impact., _rule_based_recommendations() (+16 more)

### Community 22 - "ai_interpreter.py"
Cohesion: 0.22
Nodes (26): _answer_best_day(), _answer_buy(), _answer_cross_sell(), _answer_dead_stock(), _answer_discount(), _answer_expiry(), _answer_health(), _answer_monthly() (+18 more)

### Community 23 - "billing_engine.py"
Cohesion: 0.12
Nodes (23): process_sale(), datetime, PosSaleRequest, Session, UUID, Atomic POS transaction engine. Every sale is one database transaction: validate…, Atomic POS transaction with FEFO batch deduction and full sale persistence., _resolve_product() (+15 more)

### Community 24 - "backend-types.ts"
Cohesion: 0.07
Nodes (27): AiInsight, AiPriorityAction, AiPriorityActions, AtRiskItem, BatchOut, ConfirmReceiptResponse, DailyBrief, DailyBriefSection (+19 more)

### Community 25 - "scanner/page.tsx"
Cohesion: 0.13
Nodes (23): CartItem, PosPage(), ProductsPage(), ScannerPage(), Stage, Tab, BarcodeScanner(), MobileReceiveModal() (+15 more)

### Community 26 - "reports.py"
Cohesion: 0.16
Nodes (23): _date_range(), expiry_report(), gst_report(), inventory_report(), procurement_report(), products_report(), profit_report(), get (+15 more)

### Community 27 - "behavior_engine.py"
Cohesion: 0.21
Nodes (22): associations(), _baskets(), discount_response(), full_behavior(), impulse_patterns(), _product_names(), Any, datetime (+14 more)

### Community 28 - "actions/page.tsx"
Cohesion: 0.19
Nodes (18): ActionsPage(), ActionTab, cardMeta(), planMeta(), TABS, AlertsPage(), planMeta(), InventoryPage() (+10 more)

### Community 29 - "dashboard/layout.tsx"
Cohesion: 0.15
Nodes (15): AiChatbotModal(), ChatMessage, MANDATORY_QUESTIONS, isActivePath(), NavGroup, navGroups, NavItem, Sidebar() (+7 more)

### Community 30 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+13 more)

### Community 31 - "llm_service.py"
Cohesion: 0.17
Nodes (19): _llm_answer(), Best-effort LLM rewrite of the grounded answer. Returns None on any failure., current_model(), _extract_json(), generate_json(), generate_recommendations(), has_llm(), _in_cooldown() (+11 more)

### Community 32 - "auth.py"
Cohesion: 0.17
Nodes (17): Dependency factory — returns a dependency enforcing that the current user holds…, require_roles(), LoginRequest, RegisterRequest, TokenResponse, create_employee(), login(), me() (+9 more)

### Community 33 - "whatsapp.py"
Cohesion: 0.16
Nodes (17): classify_intent(), intent_response(), Any, WhatsApp Business API helpers, signature verification, and five intents., Send through Meta when configured; otherwise return a deterministic mock., send_message(), verify_signature(), verify_token() (+9 more)

### Community 34 - "suppliers.py"
Cohesion: 0.20
Nodes (18): PurchaseOrderCreate, SupplierCreate, SupplierScorecardOut, SupplierUpdate, create_purchase_order(), create_supplier(), delete_supplier(), list_purchase_orders() (+10 more)

### Community 35 - "dependencies"
Cohesion: 0.11
Nodes (19): clsx, date-fns, dexie, html5-qrcode, lucide-react, dependencies, clsx, date-fns (+11 more)

### Community 36 - "test_auth.py"
Cohesion: 0.12
Nodes (8): Any, Deep-copy ``data`` (dict/list) with financial fields set to None. Used so STAFF…, redact_financials(), verify_password(), Auth: login, register, /me, token validation, RBAC role claims., test_password_hash_verify_roundtrip(), test_redact_financials_nulls_financial_keys(), test_verify_password_tolerates_garbage()

### Community 37 - "seed.py"
Cohesion: 0.20
Nodes (17): lifespan(), create_all(), drop_all(), InvoiceItem, Create tables if they don't exist (used in main lifespan)., Drop all tables (used by seed --force and tests)., Sale, Supplier (+9 more)

### Community 38 - "Toast.tsx"
Cohesion: 0.17
Nodes (11): meta, Toast(), Toaster(), makeId(), toast, ToastState, useToastStore, Toast (+3 more)

### Community 39 - "allocate"
Cohesion: 0.23
Nodes (14): allocate(), InsufficientStockError, date, First-Expired, First-Out allocation for POS sales., Allocate ``quantity`` units from active, non-expired batches in FEFO order.…, make_batch(), FEFO batch allocation unit tests., test_does_not_mutate_batches() (+6 more)

### Community 40 - "ai_actions.py"
Cohesion: 0.25
Nodes (14): ActionOut, ExecuteActionRequest, MessageOut, _action(), dismiss(), execute(), generate(), get_action() (+6 more)

### Community 41 - "GlobalState.tsx"
Cohesion: 0.15
Nodes (10): inter, metadata, AIInsight, Batch, defaultInsights, defaultProducts, GlobalStateContext, GlobalStateContextType (+2 more)

### Community 42 - "Product"
Cohesion: 0.20
Nodes (11): Barcode lookup seam. Camera decoding runs in the frontend; this service…, extract_invoice_text(), OcrResult, parse_invoice(), Invoice OCR pipeline with Google Gemini Flash., Use Gemini to extract structured JSON from the invoice image., Product, _create_milk() (+3 more)

### Community 43 - "database.py"
Cohesion: 0.24
Nodes (12): BarcodeCatalog, Base, InventoryTransaction, Invoice, MonthlyReport, PurchaseOrder, PurchaseOrderItem, SQLAlchemy ORM models — mirror the architecture doc section 5 tables exactly,… (+4 more)

### Community 44 - "conftest.py"
Cohesion: 0.21
Nodes (13): client(), db(), manager_headers(), memdb(), owner_headers(), Pytest fixtures — isolated SQLite DB + one seeded TestClient per session.…, Seeded TestClient (app lifespan: create_all -> seed_if_empty)., A session to the seeded test DB for direct assertions. (+5 more)

### Community 46 - "layout/Sidebar.tsx"
Cohesion: 0.21
Nodes (7): BottomNav(), items, insights, overview, Sidebar(), SidebarLink(), SidebarLinkProps

### Community 47 - "useDashboardData.ts"
Cohesion: 0.23
Nodes (11): pingBackend(), rawFetch(), emptyDashboardSummary(), getDashboardSummary(), mockDashboardSummary(), DashboardSummary, DashboardState, EMPTY_DATA (+3 more)

### Community 48 - "intelligence/page.tsx"
Cohesion: 0.20
Nodes (8): BADGE_TONES, CLASS_BADGES, TabItem, Tabs(), AIAssociationData, AIHeatmapData, AIInsight, ProductMatrixRow

### Community 49 - "KPICard.tsx"
Cohesion: 0.27
Nodes (7): accentMap, CountUp(), CountUpProps, Sparkline(), SparklineProps, easeOutExpo(), useCountUp()

### Community 50 - "package.json"
Cohesion: 0.18
Nodes (10): engines, node, name, private, scripts, build, dev, lint (+2 more)

### Community 51 - "green_score.py"
Cohesion: 0.31
Nodes (9): GreenScoreOut, ScoreComponent, current(), history(), output(), get, post, Green Score current value, history, and recalculation. (+1 more)

### Community 52 - "live.ts"
Cohesion: 0.31
Nodes (8): dashboardWsUrl(), ensureAuth(), isDemoMode(), emitLive(), Listener, listeners, LiveEvent, LiveProvider()

### Community 53 - "opportunity_engine.py"
Cohesion: 0.33
Nodes (8): _classify(), _expected_impact(), opportunities_for_store(), Any, datetime, Session, Product Opportunity Engine (AI spec §23). For every product we compute demand,…, _utcnow()

### Community 54 - "expiry_parser.py"
Cohesion: 0.33
Nodes (8): _parse_date(), parse_dates(), parse_expiry_fields(), parse_invoice_lines(), date, Invoice/label expiry extraction helpers. Patterns intentionally accept the…, Find the first explicit expiry date in arbitrary OCR text., Parse a simple line-oriented invoice into normalized dictionaries.

### Community 55 - "settings/page.tsx"
Cohesion: 0.25
Nodes (6): INITIAL_ROLES, INITIAL_USERS, PERMISSION_MODULES, PermissionNode, Role, UserType

### Community 56 - "ConnectionManager"
Cohesion: 0.39
Nodes (3): ConnectionManager, Any, WebSocket

### Community 57 - "data_quality.py"
Cohesion: 0.29
Nodes (5): combine(), confidence_score(), Public data-quality tiers — shared by every AI surface (§13 of the AI spec). An…, Map a data-quality tier to a conservative confidence percentage., Combines several tiers pessimistically: the weakest level wins.

### Community 59 - "procurement/page.tsx"
Cohesion: 0.33
Nodes (4): AUTO_REORDERS, containerVariants, itemVariants, RECENT_POS

### Community 61 - "config.py"
Cohesion: 0.33
Nodes (3): Application configuration via environment variables / .env file., Settings, BaseSettings

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

### Community 67 - "generate_monthly_report"
Cohesion: 0.50
Nodes (4): generate_monthly_report(), Any, Session, Generate or refresh monthly summary for store_id and month_year (YYYY-MM).

## Knowledge Gaps
- **224 isolated node(s):** `metadata`, `MOCK_METRICS`, `MOCK_PRIORITIES`, `MOCK_INSIGHTS`, `AUTO_REORDERS` (+219 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `auth.py`, `whatsapp.py`, `ai_intelligence.py`, `suppliers.py`, `schemas.py`, `seed.py`, `main.py`, `ai_actions.py`, `database.py`, `analytics.py`, `green_score.py`, `reports.py`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Product` connect `Product` to `ai_intelligence.py`, `math_engine.py`, `schemas.py`, `main.py`, `test_detection_engine.py`, `InventoryBatch`, `User`, `analytics.py`, `insight_engine.py`, `test_score_engine.py`, `action_engine.py`, `billing_engine.py`, `reports.py`, `behavior_engine.py`, `suppliers.py`, `seed.py`, `ai_actions.py`, `database.py`, `opportunity_engine.py`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `InventoryBatch` connect `InventoryBatch` to `ai_intelligence.py`, `math_engine.py`, `schemas.py`, `suppliers.py`, `seed.py`, `test_detection_engine.py`, `Product`, `database.py`, `User`, `analytics.py`, `insight_engine.py`, `test_score_engine.py`, `action_engine.py`, `opportunity_engine.py`, `billing_engine.py`, `reports.py`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `metadata`, `MOCK_METRICS`, `MOCK_PRIORITIES` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05926251097453907 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.08441558441558442 - nodes in this community are weakly interconnected._
- **Should `ai_intelligence.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08636363636363636 - nodes in this community are weakly interconnected._