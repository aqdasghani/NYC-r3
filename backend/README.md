# Green Quant AI — Backend

AI-powered retail inventory & waste-prevention platform for small Indian retailers.
A FastAPI modular monolith implementing the full PRD (F1–F13): smart receiving
(barcode/OCR), batch & expiry tracking, FEFO POS, AI risk detection, AI action
plans, waste prevention, Green Score, supplier scorecards, WhatsApp assistant,
and live dashboard updates over WebSocket.

Runs fully **offline out of the box** — SQLite + in-memory cache + rule-based AI
fallbacks — and upgrades to PostgreSQL / Redis / live LLM via env vars.

## Stack

| Piece        | Default (demo)          | Production switch                    |
|--------------|-------------------------|--------------------------------------|
| API          | FastAPI 0.111 + uvicorn | —                                    |
| Database     | SQLite `Green Quant.db`   | `DATABASE_URL=postgresql+psycopg://…`|
| Cache        | In-memory TTL           | `REDIS_URL=redis://…`                |
| Auth         | Self-contained JWT      | Swap for Supabase (same claim shape) |
| AI           | Rule-based (no keys)    | `OPENAI_API_KEY` / `GEMINI_API_KEY`  |
| OCR          | Built-in invoice parser | `GOOGLE_VISION_API_KEY`              |

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # optional; sensible defaults are already compiled in
```

## Run

```bash
python -m uvicorn app.main:app --reload --port 8000
```

The first boot creates the schema, seeds demo data (2 stores, 3 users,
~1,284 products, 30 days of sales, 5 AI recommendations), and starts the
15-minute background detection job.

* OpenAPI docs: <http://localhost:8000/docs>
* Health: <http://localhost:8000/api/health>

### Demo logins (password `demo1234`)

| Email                | Role    |
|----------------------|---------|
| `rahul@Green Quant.ai` | OWNER   |
| `priya@Green Quant.ai` | MANAGER |
| `amit@Green Quant.ai`  | STAFF   |

## Demo flow (the hackathon story)

1. **Login** as Rahul → `POST /api/auth/login`.
2. **Smart receiving** → `POST /api/receiving/scan-invoice` (upload any file;
   the built-in parser extracts items and fuzzy-matches the catalog) → confirm
   → `POST /api/receiving/confirm`. Confirmation creates the batch and triggers
   a full AI risk-detection sweep.
3. **AI Risk Detection & Action Plan** → `GET /api/actions` lists PENDING
   recommendations (Expiry Risk, Waste Risk, Stockout, Overstock, Demand Spike…).
   `POST /api/actions/{id}/execute` with a chosen action (DISCOUNT / TRANSFER /
   RETURN / REORDER) records a WasteEvent — the dashboard's "Waste Prevented"
   and Green Score move.
4. **POS** → `POST /api/pos/sale` sells via barcode with FEFO batch allocation
   and a GST receipt; live updates are pushed over `ws://localhost:8000/ws/dashboard`.
5. **Green Score** → `GET /api/analytics/dashboard` shows the weighted
   sustainability score (expiry 30% / inventory 30% / dead stock 20% / waste 20%),
   at-risk stock, expiry timeline, and the donut.
6. **WhatsApp** → `POST /api/whatsapp/webhook` with any message like
   *"kya waste hua?"* returns a natural-language answer (demo mode accepts
   unsigned payloads).

## Tests

```bash
python -m pytest
```

80 tests across auth, POS/FEFO, receiving, detection, scoring, actions,
analytics, WhatsApp, cache, and WebSocket. Engine tests use an isolated
in-memory DB; API tests run against a throwaway seeded SQLite file — your
`Green Quant.db` is never touched.

## Project layout

```
backend/
├── app/
│   ├── main.py               # factory + lifespan (create, seed, scheduler)
│   ├── config.py             # pydantic-settings (env-driven)
│   ├── deps.py               # get_db, RBAC dependencies, staff redaction
│   ├── security.py           # bcrypt + JWT
│   ├── cache.py              # MemoryCache / RedisCache
│   ├── ws.py                 # WebSocket connection manager
│   ├── scheduler.py          # APScheduler detection job
│   ├── seed.py               # deterministic demo data
│   ├── models/               # SQLAlchemy ORM + Pydantic schemas
│   ├── engines/              # expiry, forecast, detection, action, waste, score
│   ├── integrations/         # OCR, LLM, WhatsApp, barcode
│   ├── routers/              # auth, pos, receiving, inventory, analytics,
│   │                         # ai_actions, sales, suppliers, whatsapp, ws
│   └── utils/                # FEFO allocation
└── tests/                    # pytest suite (conftest + 12 modules)
```
