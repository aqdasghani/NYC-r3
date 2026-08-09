<div align="center">
  <img src="public/favicon.ico" alt="Green Quant AI Logo" width="100" />
  <h1>🌿 Green Quant AI</h1>
  <p><strong>Smart Retail. Zero Waste. Stop Money Walking Out.</strong></p>
  <p>
    An intelligent, AI-powered inventory management and business intelligence platform designed specifically for retail chains, pharmacies, and grocery stores to minimize waste, optimize stock, and maximize profitability.
  </p>

  <p>
    <a href="#features"><strong>Features</strong></a> ·
    <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
    <a href="#getting-started"><strong>Getting Started</strong></a> ·
    <a href="#project-structure"><strong>Project Structure</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Python-Backend-3776AB?style=for-the-badge&logo=python" alt="Python" />
    <img src="https://img.shields.io/badge/AI-Powered-0FA958?style=for-the-badge&logo=openai" alt="AI Powered" />
  </p>
</div>

<hr />

## ✨ Features

Green Quant AI transcends basic expiry tracking. It is a comprehensive Business Intelligence platform:

### 🏪 Store & Business Management
- **Multi-Branch Support:** Manage multiple stores, branches, and warehouses from a single unified dashboard.
- **Store-Wise Analytics:** Track performance, sales, and inventory metrics per location.
- **User Management & Roles:** Define permissions for owners, managers, and staff across different branches.

### 📦 Intelligent Inventory
- **Real-Time Stock Tracking:** Monitor inventory levels with an elegant, high-density dashboard.
- **Barcode Scanner:** Built-in device camera barcode scanning for rapid stock entry and verification.
- **Stock Transfers:** Step-by-step wizard for handling stock transfers between stores and godowns.
- **Supplier Management:** Track supplier relationships, order history, and fulfillment performance.

### 🧠 AI Business Intelligence
- **Expiry Timeline & Risk Analysis:** AI predicts when items will expire and calculates the financial value at risk.
- **Actionable AI Priority Cards:**
  - 🚨 **Sell First:** Highlights items nearing expiry.
  - 📉 **Discount:** Recommends markdown pricing to recover value.
  - 🔄 **Transfer:** Suggests moving stock to branches with higher demand.
  - 🛒 **Reorder:** Prevents stockouts by predicting demand spikes.
- **Daily AI Briefing:** Auto-generated daily summaries detailing important actions and estimated financial impact.

### 🌍 Sustainability & "Green Score"
- **Waste Prevented Tracking:** Quantifies the amount of inventory saved from expiring.
- **Green Score Gauge:** A real-time gamified metric (0-100) scoring your store's sustainability and inventory efficiency.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js (App Router)](https://nextjs.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Data Visualization:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)

### Backend & AI
- **Language:** Python
- **Framework:** FastAPI *(Backend API routers for inventory, receiving, and auth)*
- **AI Services:** OCR integration for invoice scanning and AI-driven insights engine.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and `npm` installed for the frontend, and Python 3.x for the backend.

### 1. Clone the repository
```bash
git clone https://github.com/aqdasghani/NYC-r3.git
cd NYC-r3
```

### 2. Frontend Setup
Navigate to the root directory and install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### 3. Backend Setup
Navigate to the backend directory:
```bash
cd backend
```
*(Refer to the `backend/README.md` for specific Python environment setup and API execution instructions).*

---

## 📂 Project Structure

```text
.
├── app/                  # Next.js App Router (Pages & Layouts)
│   ├── dashboard/        # Main application interface (Inventory, Sales, etc.)
│   ├── login/            # Authentication pages
│   └── globals.css       # Global theme and styling variables
├── components/           # Reusable React components
│   ├── dashboard/        # Sidebar, TopHeader, navigation components
│   ├── marketing/        # Landing page components
│   └── ui/               # Generic UI elements (Tables, Scanners, etc.)
├── lib/                  # Utilities, Types, and API Client hooks
└── backend/              # Python FastAPI backend
    ├── app/
    │   ├── routers/      # API endpoints (auth, inventory, receiving)
    │   └── integrations/ # OCR & AI services
    └── README.md
```

---

## 🎨 UI/UX Design

Green Quant AI features a **Premium Light Theme**:
- **Data-Dense Layouts:** Designed for power users who need to see maximum information without feeling overwhelmed.
- **Glassmorphism & Shadows:** Subtle `.glass-panel` and `.premium-shadow` utilities create depth and hierarchy.
- **Brand Colors:** Utilizing a professional palette anchored by Deep Green (`#063120`), Vibrant Emerald (`#0FA958`), and clean Slate typography.

<div align="center">
  <br />
  <p><i>Built to stop money walking out your retail doors.</i></p>
</div>
