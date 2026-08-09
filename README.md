<div align="center">

![Green Quant AI Banner](./public/banner.jpg)

<br/>

<img src="./public/logo.jpg" alt="Green Quant AI Logo" width="120" height="120" style="border-radius: 24px;" />

# Green Quant AI

### 🌿 Behavioral Retail Intelligence · Zero Waste · AI-Powered

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-DB-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org/)

---

*The complete AI operating system for small Indian retailers — built to prevent waste, maximise margin, and turn sales data into actions.*

</div>

---

## 📑 Table of Contents

- [What is Green Quant AI?](#-what-is-green-quant-ai)
- [Why We Built This](#-why-we-built-this)
- [Architecture Overview](#-architecture-overview)
- [Feature Modules](#-feature-modules)
- [AI Engine Architecture](#-ai-engine-architecture)
- [Backend API Reference](#-backend-api-reference)
- [Database Schema](#-database-schema)
- [Frontend Architecture](#-frontend-architecture)
- [Authentication & Security](#-authentication--security)
- [Real-Time WebSocket](#-real-time-websocket)
- [Tech Stack](#-tech-stack)
- [Local Development Setup](#-local-development-setup)
- [Environment Variables](#-environment-variables)
- [Demo Credentials](#-demo-credentials)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)

---

## 🌿 What is Green Quant AI?

**Green Quant AI** is a full-stack, AI-powered retail management platform purpose-built for **small Indian grocery and convenience stores**. It combines:

- **Behavioral Retail Intelligence** — studies what customers actually buy, when they buy it, and what they buy together (co-purchase / basket analysis).
- **Zero-Waste Operations** — alerts owners before perishables expire and calculates the financial value of waste prevented.
- **Quantitative Decision Support** — every number is pulled directly from your own sales and inventory data. No guesses, no estimations, no AI hallucinations.
- **AI Copilot** — an owner-facing chat assistant that answers questions like *"What should I buy today?"* or *"Why did sales drop on Thursday?"* with database-grounded evidence.

> **Iron Law:** Every metric in Green Quant AI is sourced exclusively from `Sale` (Invoice / InvoiceItem) or `InventoryBatch` records in the database. The AI never invents numbers.

---

## 🏗️ Why We Built This

Indian kirana and grocery store owners are smart, hardworking, and deeply tuned to their customers. But they lack:

- Visibility into *which* products are silently expiring
- Understanding of *when* their peak hours are and what drives basket size
- Data-backed recommendations for *what* to order and *how much*
- A way to measure their store's environmental sustainability

Green Quant AI fills this gap with a clean, mobile-friendly dashboard — no spreadsheets, no complexity, just clear actions every morning.

---

## 🏛️ Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js 16)                       │
│  Dashboard (15+ pages) → lib/api.ts → HTTP + WebSocket proxy      │
└───────────────────────────────────────────────────────────────────┘
                          │ /api/* and /ws/* → :8000
┌───────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND (:8000)                       │
│  Routers: auth, inventory, sales, analytics, ai_intelligence,     │
│           procurement, suppliers, reports, whatsapp, ws, ...      │
│                                                                   │
│  Engine Layer:                                                    │
│    math_engine      → pure Python, DB-grounded numbers            │
│    insight_engine   → AI insights + evidence                      │
│    behavior_engine  → basket / heatmap analysis                   │
│    ai_interpreter   → Copilot NL answers                          │
│    score_engine     → Green Score calculation                     │
│    detection_engine → anomaly / expiry alerts (scheduler)         │
│    action_engine    → priority action queue                       │
│    forecast_engine  → demand projection                           │
│    opportunity_eng. → cross-sell, promotions                      │
│                                                                   │
│  SQLAlchemy ORM ←→ SQLite / PostgreSQL                            │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Feature Modules

### 🏠 Dashboard (Home)

The nerve centre of the store. Widgets:

| Widget | Description |
|--------|-------------|
| **Green Score** | Live 0–100 sustainability score with history chart |
| **Revenue Today** | Real sales vs yesterday |
| **Waste Prevented** | Rs value of products sold before expiry |
| **At-Risk Inventory** | Products expiring within 7 days |
| **Action Center** | Prioritised DO NOW / DO TODAY / WATCH / OPPORTUNITY queue |
| **Expiry Alert Banner** | Prominent warning when batches expire in 3 days |
| **Category Mix Chart** | Revenue pie by product category |
| **Recent Transactions** | Last 10 sales from live database |
| **AI Briefing Strip** | Daily one-liner AI recommendation |

Auto-refreshes every 60 seconds via WebSocket + HTTP polling.

---

### 📦 Inventory Management

Full batch-aware inventory system.

- **Batch Tracking** — receive date, expiry date, quantity, purchase price, selling price
- **Expiry Heat** — colour-coded rows (red <3 days, amber <7 days, green safe)
- **Product Search + Category Filter** — instant client-side filtering
- **Receive New Stock** — form to add inventory batches
- **Dead Stock Detection** — batches with zero sales in 60+ days highlighted
- **Bulk Adjustment** — with reason codes (damage, theft, count correction)
- **Low Stock Alerts** — products below reorder threshold

```
GET  /api/inventory/batches
GET  /api/inventory/batches/expiring
POST /api/inventory/receive
POST /api/inventory/products
PATCH /api/inventory/batches/{id}
```

---

### 🛒 Point of Sale (POS)

Touch-friendly checkout interface.

- **Barcode scan** — html5-qrcode camera scanner
- **Product search** — fuzzy name search with live dropdown
- **Cart management** — add / remove / quantity with animations
- **Session management** — POS sessions group invoices for basket analysis
- **Discount application** — line-level and cart-level
- **Receipt generation** — PDF via jsPDF
- **Payment modes** — Cash / UPI / Card
- **Real-time inventory deduction** — stock decremented on sale (FIFO by batch)
- **WhatsApp receipt** — send to customer's WhatsApp

Each sale creates: `Invoice` + N `InvoiceItem` records + inventory deductions.

---

### 📊 Sales Analytics

Tabs:

| Tab | Contents |
|-----|----------|
| **Overview** | Revenue + transaction cards, period comparison |
| **Trends** | Daily revenue line chart |
| **Products** | Top-10 by revenue with margin % |
| **Categories** | Category revenue bar chart |
| **Hourly** | Average sales per hour of day |
| **Comparison** | Current vs previous period |

Date range: Today / Yesterday / Last 7 days / Last 30 days / Custom.

---

### 🧠 AI Intelligence Hub

Four sections in one page:

**1. Action Center**
- DO NOW (red) — expiry ≤2 days or >Rs 5,000 at risk
- DO TODAY (amber) — expiry ≤5 days or >Rs 1,000
- WATCH (yellow) — monitor, no action yet
- OPPORTUNITY (green) — revenue upside

Each card shows: Title, category badge, evidence panel (real DB numbers), recommendation, expected impact, confidence + data quality.

**2. Behavioral Heatmap**
24-hour × N-product matrix. Cell colour = sales volume. Reveals exactly when each product peaks.

**3. Insights Feed**
Filter tabs: ALL / CRITICAL / EXPIRY / BEHAVIOR / OPPORTUNITY / DEMAND.
Each insight: priority badge, evidence dictionary, AI explanation, confidence %.

**4. Product Matrix**
| Classification | Criteria |
|----------------|----------|
| STAR | High velocity + positive trend |
| GROWING | Increasing week-over-week |
| DECLINING | Falling sales velocity |
| DEAD | Near-zero velocity (<0.5 units/day) |
| RISKY | Low expiry coverage + high perishability |

---

### 💬 AI Copilot Chat

Natural-language Q&A about your store. Split-pane layout:
- **Left**: Chat thread with typing animation
- **Right**: Evidence Panel — exact database numbers used to answer

Supported intents and example questions:

| Intent | Examples |
|--------|----------|
| `buy` | "What should I buy today?" / "What needs restocking?" |
| `expiry` | "What's expiring this week?" |
| `profit` | "Which products make the most money?" |
| `sales_drop` | "Why did sales drop on Thursday?" |
| `dead_stock` | "What's not selling?" |
| `peak` | "When are customers busiest?" |
| `cross_sell` | "What do people buy together?" |
| `discount` | "What should I discount?" |
| `stockout` | "What's running out?" |
| `monthly` | "How are we doing this month?" |

Response format: **Observation → Evidence → Interpretation → Recommendation → Expected Impact**

Model: Gemini or OpenAI. Falls back to rule-based deterministic answers if no key set (`fallback_used: true` always reported).

---

### 🌡️ Behavioral Heatmap (Full Page)

Full interactive page with:
- Hour slider to zoom into time windows
- Product + category filters
- Export as CSV / PNG
- Hover tooltip: unit count + Rs value in that hour

Data: `Invoice` + `InvoiceItem` grouped by `product_id × hour_of_day`.

---

### 🛍️ Procurement & Purchase Orders

Three tabs:

1. **AI Suggestions** — Reorder recommendations based on:
   - Current stock coverage (days of supply)
   - Historical daily sales velocity
   - Supplier lead times
   - Confidence score per recommendation
   - Approve → creates real PurchaseOrder in DB

2. **Purchase Orders** — List all POs:
   - Status: DRAFT → SENT → CONFIRMED → IN_TRANSIT → DELIVERED → CANCELLED
   - Filter by status, download PDF

3. **Create PO** — Manual PO form: supplier + line items + auto-calculated cost

```
GET  /api/procurement/summary
GET  /api/procurement/orders
POST /api/procurement/orders
PATCH /api/procurement/orders/{id}
GET  /api/procurement/suggestions
```

---

### 🏪 Supplier Management

Full CRUD for suppliers:
- Name, contact, phone, email, address, GST, payment terms
- Active/inactive status, last order date
- Supplier performance: on-time delivery %, avg lead time
- Link POs to suppliers

---

### 📤 Returns & Transfers

**Returns:** Log returned products with reason codes, inventory re-crediting or wastage writeoff.

**Transfers:** Move stock between locations — source, destination, product, quantity, status tracking.

---

### 📋 Reports Module

| Report | Description |
|--------|-------------|
| Monthly Summary | Revenue, transactions, waste value, Green Score, top category/product |
| Expiry Report | Products expiring in date range, value at risk |
| Dead Stock Report | Items with no sales in 30/60/90 days |
| Profit & Loss | Revenue vs COGS vs gross margin per period |
| Green Score History | Sustainability score trend over time |
| Supplier Report | PO volumes, spend, lead times per supplier |

Export formats: CSV, PDF.

---

### 🌿 Sustainability & Green Score

#### Score Formula
```
Green Score = (Expiry Prevention × 30%)
            + (Inventory Efficiency × 30%)
            + (Dead Stock Reduction × 20%)
            + (Waste Reduction × 20%)
```

| Component | What It Measures |
|-----------|-----------------|
| Expiry Prevention (30%) | Ratio of waste prevented vs at-risk value |
| Inventory Efficiency (30%) | Proportion of stock not stale (>60 days) |
| Dead Stock Reduction (20%) | % of stock actively selling |
| Waste Reduction (20%) | Prevented vs actual waste events |

All values clamped 0–100. Persisted daily in `GreenScoreHistory`.

Dashboard: live score gauge, 30-day trend chart, per-component breakdown bars, CO₂ equivalent saved.

---

### 📱 WhatsApp Integration

- Daily briefing to owner at configured time
- Expiry alerts when items hit threshold
- PO confirmations to suppliers
- Customer receipt via WhatsApp
- Webhook for incoming messages

```
POST /api/whatsapp/send-briefing
POST /api/whatsapp/send-alert
POST /api/whatsapp/webhook
GET  /api/whatsapp/webhook   (webhook verification)
```

---

### 🔔 Alerts & Actions Center

Alert types: `EXPIRY_ALERT`, `LOW_STOCK`, `DEAD_STOCK`, `PRICE_ANOMALY`, `DEMAND_SPIKE`, `WASTE_EVENT`

Priority tiers:
| Priority | Badge | Trigger |
|----------|-------|---------|
| DO_NOW | Red | Expiry ≤2 days OR value >Rs 5,000 |
| DO_TODAY | Amber | Expiry ≤5 days OR value >Rs 1,000 |
| WATCH | Yellow | Expiry ≤14 days or moderate issue |
| OPPORTUNITY | Green | Revenue upside opportunity |

Actions: Done / Snoozed / Dismissed.

---

### 📷 Barcode Scanner

**Mode 1: Lookup** — Scan barcode → fetch product → show stock + price + expiry → add to POS cart.

**Mode 2: Register new product** — Unknown barcode → form slides in with barcode pre-filled → Name, category, purchase price, selling price → creates product in DB.

---

### 🌅 Daily Briefing

Morning summary:
- Yesterday's revenue vs same day last week
- Top 3 products to action today
- Green Score update
- One AI-generated insight
- Alert count

---

## 🤖 AI Engine Architecture

### Math Engine (Iron Law)

**File:** `backend/app/engines/math_engine.py` (758 lines)

```
IRON LAW: Every number returned by this module comes from the database.
No estimation, no interpolation without a stated formula, no invention.
```

Key functions:
| Function | Purpose |
|----------|---------|
| `sales_velocity()` | Units sold per day over N days |
| `stock_coverage_days()` | Days of stock at current velocity |
| `expiry_at_risk()` | Rs value of batches expiring in N days |
| `top_products_by_revenue()` | Ranked products by Rs revenue |
| `category_revenue()` | Revenue per category |
| `hourly_sales_pattern()` | Hour → units sold dict |
| `basket_size_distribution()` | Histogram of items per basket |
| `product_association_lift()` | Co-purchase lift scores |
| `gross_margin_by_product()` | (revenue - COGS) per product |
| `dead_stock_value()` | Rs value of unsold stock |
| `data_quality()` | "HIGH" / "MEDIUM" / "LOW" |

---

### Insight Engine

**File:** `backend/app/engines/insight_engine.py` (420 lines)

Combines math + behavior engines into structured insights:
```json
{
  "title": "Approaching Expiry — Amul Taaza",
  "category": "EXPIRY",
  "priority": "DO_NOW",
  "evidence": {"batches": 3, "units": 45, "value": 2400, "days": 2},
  "recommendation": "Apply 20-30% discount immediately",
  "expected_impact": "Recover Rs 1,680–1,920 instead of total loss",
  "confidence": "HIGH",
  "data_quality": "HIGH"
}
```

---

### Behavior Engine

**File:** `backend/app/engines/behavior_engine.py` (303 lines)

Studies observable purchasing patterns — never makes psychological inferences about individuals.

| Analysis | Output |
|----------|--------|
| Time segmentation | MORNING / AFTERNOON / EVENING / NIGHT |
| Shopping missions | QUICK TOP-UP / DAILY ESSENTIALS / WEEKLY SHOP / HOUSEHOLD RESTOCK |
| Peak hour detection | Top 3 hours by transaction volume |
| Basket co-occurrence | Products bought together |
| Lift score | P(A∩B) / (P(A)×P(B)) |
| Day-of-week patterns | Best and worst revenue days |

---

### AI Interpreter (Copilot)

**File:** `backend/app/engines/ai_interpreter.py` (576 lines)

Pipeline:
1. Intent detection (keyword matching across 15 categories)
2. Data gathering (math engine + behavior engine)
3. Prompt construction (real data embedded)
4. LLM call (Gemini / OpenAI / rule-based fallback)
5. Response: OBSERVATION → EVIDENCE → INTERPRETATION → RECOMMENDATION → IMPACT

Honesty rules always enforced:
- `confidence` derived from real `data_quality` tier (60% LOW / 80% MEDIUM / 95% HIGH)
- `model_used` names real model or `"rule-based"` for deterministic answers
- `fallback_used: true` when deterministic engine answered

---

### Score Engine (Green Score)

**File:** `backend/app/engines/score_engine.py` (70 lines)

```python
score = clamp(
    score_expiry_prevention() × 0.30 +
    score_inventory_efficiency() × 0.30 +
    score_dead_stock() × 0.20 +
    score_waste_reduction() × 0.20
)
```

Persisted to `GreenScoreHistory` once per day via background scheduler.

---

### Detection Engine

**File:** `backend/app/engines/detection_engine.py`

Runs every 15 minutes (APScheduler). Checks:
- Batches expiring ≤7 days → creates Action records
- Quantity < reorder point → low-stock alerts
- Anomalous velocity spikes → demand spike alerts
- Selling price below cost → margin risk alerts

---

### Action Engine

**File:** `backend/app/engines/action_engine.py`

- Creates actions from detected issues
- Deduplication by type + product + date
- Snooze management (re-surfaces after interval)
- Done/dismissed state tracking

---

### Forecast Engine

**File:** `backend/app/engines/forecast_engine.py`

Exponential smoothing on historical InvoiceItem data:
```
Forecast = α × recent_velocity + (1-α) × historical_avg
Suggested Qty = Forecast × (lead_time_days + safety_days)
```

---

### Opportunity Engine

**File:** `backend/app/engines/opportunity_engine.py`

- Cross-sell: high lift score pairs where trigger sells but suggested doesn't
- Category gaps: high basket penetration but low SKU count
- Hour-shift: product with strong off-peak sales → time-limited offer

---

## 🔌 Backend API Reference

Base URL: `http://localhost:8000`

### Auth
```
POST /api/auth/register    – Register store owner
POST /api/auth/login       – Login (JWT + HttpOnly cookie)
POST /api/auth/logout      – Clear session
GET  /api/auth/me          – Current user
PATCH /api/auth/profile    – Update profile
```

### Inventory
```
GET  /api/inventory/batches
GET  /api/inventory/batches/expiring
POST /api/inventory/receive
POST /api/inventory/products
GET  /api/inventory/products/barcode/{barcode}
PATCH /api/inventory/batches/{id}
```

### Sales
```
POST /api/sales/invoice
GET  /api/sales/recent
```

### Analytics
```
GET /api/analytics/dashboard
GET /api/analytics/trends?period=7d
GET /api/analytics/products?limit=10
GET /api/analytics/categories
GET /api/analytics/hourly
GET /api/analytics/monthly-report
```

### AI
```
GET  /api/ai/insights
GET  /api/ai/heatmap
GET  /api/ai/behavior
GET  /api/ai/associations
GET  /api/ai/matrix
POST /api/ai/ask
```

### Procurement
```
GET  /api/procurement/summary
GET  /api/procurement/orders
POST /api/procurement/orders
PATCH /api/procurement/orders/{id}
GET  /api/procurement/suggestions
```

### Reports
```
GET /api/reports/monthly
GET /api/reports/expiry
GET /api/reports/dead-stock
GET /api/reports/profit-loss
```

### Other
```
GET  /api/suppliers
POST /api/suppliers
GET  /api/green-score
POST /api/whatsapp/send-briefing
GET  /api/actions?status=PENDING
PATCH /api/actions/{id}
GET  /api/health
WS   /ws/dashboard
```

---

## 🗄️ Database Schema

```
Store             – id, name, type, address, gstin, owner_id
User              – id, name, email, password_hash, store_id, role
Product           – id, store_id, name, barcode, category,
                    purchase_price, selling_price, reorder_point, unit
InventoryBatch    – id, store_id, product_id, supplier_id,
                    quantity, purchase_price, selling_price,
                    received_date, expiry_date, last_sale_date
Invoice           – id, store_id, created_at, total_amount,
                    discount, payment_mode, pos_session_id
InvoiceItem       – id, invoice_id, product_id, batch_id,
                    quantity, unit_price, discount
Supplier          – id, store_id, name, contact_person, phone,
                    email, address, gstin, payment_terms, is_active
PurchaseOrder     – id, store_id, supplier_id, status, created_at,
                    expected_delivery, total_amount
PurchaseOrderItem – id, order_id, product_id, quantity, unit_cost
GreenScoreHistory – id, store_id, period_date, score,
                    expiry_score, inventory_score, dead_stock_score, waste_score
WasteEvent        – id, store_id, product_id, batch_id,
                    quantity_wasted, actual_waste, reason
Action            – id, store_id, action_type, priority, title,
                    description, product_id, status, evidence (JSON)
```

---

## 🖥️ Frontend Architecture

### Key Files

| File | Purpose |
|------|---------|
| `lib/api-client.ts` | Fetch wrapper, auth storage, JWT, WebSocket URL |
| `lib/api.ts` | All API calls with liveOr() mock-fallback |
| `lib/live.ts` | WebSocket event bus (pub/sub) |
| `lib/backend-types.ts` | TypeScript interfaces matching Pydantic schemas |
| `providers/LiveProvider.tsx` | WebSocket lifecycle, 4s reconnect backoff |
| `stores/authStore.ts` | Zustand auth state |
| `stores/cartStore.ts` | POS cart state |
| `middleware.ts` | Route protection → /login redirect |

### liveOr() Pattern

Every API call uses:
```typescript
async function liveOr<T>(
  live: () => Promise<T>,   // Real API call
  mock: () => T,            // Fallback mock data
  fallback?: () => T        // Empty state fallback
): Promise<T>
```

UI **always renders** — never crashes because the backend is unreachable.

---

## 🔐 Authentication & Security

- **JWT tokens** — HS256, 24-hour expiry
- **HttpOnly cookies** — tokens not in localStorage (prevents XSS theft)
- **bcrypt** — password hashing at cost factor 12
- **Store isolation** — every DB query scoped by `store_id` from JWT
- **CORS** — restricted to configured origins
- **Next.js middleware** — redirects unauthenticated users to `/login`
- **localStorage key:** `"Green Quant_auth"` (stores user profile for UI only)

---

## 📡 Real-Time WebSocket

**Endpoint:** `ws://localhost:8000/ws/dashboard`

```json
{
  "type": "EXPIRY_ALERT|NEW_SALE|LOW_STOCK|ACTION_CREATED|SCORE_UPDATED",
  "store_id": "uuid",
  "data": {},
  "timestamp": "ISO-8601"
}
```

`LiveProvider` maintains persistent connection with auto-reconnect (4s backoff). Events dispatched via `lib/live.ts` pub/sub — any component can subscribe without prop drilling.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version |
|------------|---------|
| Next.js | 16.3.0 |
| React | 19.2.8 |
| TypeScript | 5.x |
| Tailwind CSS | 4.3.3 |
| Framer Motion | 13.x |
| Recharts | 3.x |
| Zustand | 5.x |
| React Hook Form | 7.x |
| Zod | 4.x |
| Lucide React | 1.30 |
| html5-qrcode | 2.3 |
| jsPDF | 4.x |
| Dexie (IndexedDB) | 4.x |
| Lenis (smooth scroll) | 1.3 |
| @google/genai | 2.16 |

### Backend
| Technology | Version |
|------------|---------|
| FastAPI | 0.111.0 |
| Uvicorn | 0.30.1 |
| SQLAlchemy | 2.0+ |
| Pydantic | 2.7+ |
| APScheduler | 3.11 |
| PyJWT | 2.10 |
| bcrypt | 4.2 |
| httpx | 0.28 |
| Pillow | 12.x |
| pytesseract | 0.3 |
| openai | 2.50 |
| pandas | 2.x |
| numpy | 1.26+ |
| websockets | 12+ |

**Database:** SQLite (default) or PostgreSQL (set `DATABASE_URL`)

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js >= 20.9.0
- Python >= 3.11

### 1. Frontend Setup
```bash
npm install
cp .env.local.example .env.local
npm run dev
# → http://localhost:3000
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Windows PowerShell:
$env:PYTHONPATH="."
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

### Reset demo data
```bash
rm backend/greenshop.db
# Restart backend (auto-seeds when SEED_DEMO=true)
```

> **Note:** Next.js proxies `/api/*` to `NEXT_PUBLIC_BACKEND_URL` (default `http://127.0.0.1:8001`).
> If your backend is on port 8000, set `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` in `.env.local`.

---

## ⚙️ Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_API_URL=

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google
```

### Backend (`backend/.env`)
```env
# App
APP_NAME=GreenShop AI
DEBUG=true

# Database
DATABASE_URL=sqlite:///./greenshop.db
# PostgreSQL: DATABASE_URL=postgresql+psycopg://user:pass@host:5432/greenshop

# Auth
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRES_MIN=1440

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Scheduler
DISABLE_SCHEDULER=false
DETECTION_INTERVAL_MINUTES=15

# Seed
SEED_DEMO=true
SEED_PRODUCT_COUNT=1284

# AI (all optional — works without these)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-pro
GOOGLE_VISION_API_KEY=AIza...

# WhatsApp
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=greenshop-demo
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|---------|
| Store Owner | `admin@greenshop.ai` | `GreenShop@2024` |
| Demo User | `demo@greenshop.ai` | `demo1234` |

---

## 🚢 Deployment

### Vercel (Frontend)
```bash
npx vercel
# Set NEXT_PUBLIC_BACKEND_URL to your production backend URL
```

### Railway / Render (Backend)
Included configs:
- `railway.toml` — Railway deployment
- `render.yaml` — Render deployment
- `runtime.txt` — Python version

For production:
```env
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/greenshop
SEED_DEMO=false
JWT_SECRET=<random-256-bit-string>
```

---

## 📁 Project Structure

```
greenshop-ai/
├── app/                         # Next.js App Router
│   └── dashboard/
│       ├── page.tsx             # Main dashboard
│       ├── inventory/           # Inventory management
│       ├── pos/                 # Point of Sale
│       ├── sales/               # Sales analytics
│       ├── intelligence/        # AI Intelligence Hub
│       │   ├── copilot/         # AI Chat
│       │   └── heatmap/         # Full heatmap
│       ├── procurement/         # Purchase orders
│       ├── suppliers/           # Supplier management
│       ├── returns/             # Returns
│       ├── transfers/           # Stock transfers
│       ├── reports/             # Reports
│       ├── sustainability/      # Green Score
│       ├── scanner/             # Barcode scanner
│       ├── briefing/            # Daily briefing
│       ├── whatsapp/            # WhatsApp integration
│       ├── alerts/              # Alerts & actions
│       └── settings/            # Store settings
│
├── backend/app/
│   ├── main.py                  # FastAPI factory
│   ├── models/
│   │   ├── database.py          # SQLAlchemy ORM models
│   │   └── schemas.py           # Pydantic schemas
│   ├── routers/                 # 17 API routers
│   └── engines/
│       ├── math_engine.py       # THE source of all numbers
│       ├── insight_engine.py    # AI insight generation
│       ├── behavior_engine.py   # Behavioral patterns
│       ├── ai_interpreter.py    # Copilot NL → answer
│       ├── score_engine.py      # Green Score
│       ├── detection_engine.py  # Alert detection
│       ├── action_engine.py     # Action lifecycle
│       ├── forecast_engine.py   # Demand forecasting
│       └── opportunity_engine.py# Opportunity detection
│
├── lib/
│   ├── api-client.ts            # Auth + fetch wrapper
│   ├── api.ts                   # All API functions
│   ├── backend-types.ts         # TypeScript types
│   └── live.ts                  # WebSocket event bus
│
├── providers/LiveProvider.tsx   # WebSocket lifecycle
├── stores/                      # Zustand state
├── next.config.ts               # Next.js + proxy config
└── backend/requirements.txt     # Python dependencies
```

---

<div align="center">

### Built with love for Indian retail owners

*"Every rupee of waste prevented is a rupee of profit."*

**Green Quant AI** · [API Docs](http://localhost:8000/docs) · [Health](http://localhost:8000/api/health)

</div>
