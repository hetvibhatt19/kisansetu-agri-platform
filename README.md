# 🌾 KisanSetu — AI-Powered Cotton & Groundnut Market Linkage Platform

> Gujarat Hackathon 2026 | Domain: Economic Development | Gujarat, India
>
> Built with IBM Bob · IBM watsonx Granite · React · Node.js · PostgreSQL

---

## 📋 Problem Statement

Gujarat is a leading producer of cotton and groundnut, but farmers frequently face:
- **Price exploitation** by middlemen
- **Lack of real-time mandi price** information
- **Limited bargaining power** in direct market linkages

## 🎯 Solution

An AI-powered data + decision-support platform that:
- Provides **real-time price intelligence** for cotton & groundnut
- **Directly connects farmers with verified buyers** (no middlemen)
- Gives **AI-powered storage, quality, and selling recommendations**
- Powered by **IBM Granite LLM** for natural-language explanations

---

## 🏗️ Architecture

```
Browser (React + TypeScript)
        ↓
Backend API (Node.js / Express)
        ↓
Business Logic / Recommendation Engine (deterministic)
        ↓
5 AI Agents
        ↓
IBM Granite / watsonx (LLM for explanations only)
        ↓
PostgreSQL Database + Mock Data Layer
```

### Key Design Principles
- **LLM for language, not calculations** — IBM Granite explains; deterministic code calculates
- **Mock data layer** — App works without DB or IBM API credentials
- **Modular agents** — Each AI agent is independently swappable
- **RAG-style assistant** — Retrieves real data, then asks Granite to explain

---

## 🤖 Five AI Agents

| Agent | Purpose |
|-------|---------|
| **Mandi Price Forecasting** | Real-time prices, 7/15/30-day forecasts, trend analysis |
| **Buyer-Farmer Matching** | Transparent 6-factor scoring, top-5 buyer recommendations |
| **Storage & Selling Advisor** | Sell Now vs Store comparison with financial breakeven |
| **Quality Grading** | Rule-based grade engine (Cotton + Groundnut), CV-ready |
| **Income Dashboard** | Revenue summary, crop value, personalised insights |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (optional — app works without it in demo mode)
- npm or yarn

### 1. Clone and install

```bash
git clone <repo>
cd agri-platform

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure backend environment

```bash
cd backend
cp .env.example .env
# Edit .env — at minimum set DEMO_MODE=true for a working demo
```

### 3. Database setup (optional — skip for demo mode)

```bash
# Start PostgreSQL, then:
cd backend
npm run db:setup   # runs migrations + seed data
```

### 4. Start development servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# Frontend runs on http://localhost:3000
```

### 5. Open the app

Visit **http://localhost:3000** and click **"Login as Farmer"** for instant demo access.

---

## 🔑 Demo Credentials

| Role | Phone | Password |
|------|-------|----------|
| Farmer (Raju Patel, Rajkot) | `9876543001` | `demo123` |
| Buyer (Gujarat Agro Traders) | `9876540001` | `demo123` |

Or use the **one-click demo buttons** on the login page (no typing required).

---

## 📊 Gujarat Hackathon 2026 Demo Flow (3 minutes)

### Step 1 — Login
Click **"Login as Farmer"** → instantly enters as Raju Patel, Rajkot

### Step 2 — Dashboard
See: Cotton ₹6,850/qtl | Groundnut ₹5,420/qtl | Trend: Rising 📈 | AI Recommendation: Hold

### Step 3 — Price Forecast
Navigate to **Price Forecast** → see 90-day history + 30-day forecast chart

### Step 4 — Find Buyers
Navigate to **Find Buyers** → enter: 20 qtl Cotton, Grade A, Rajkot, ₹7,000 expected
→ AI matches top 3 buyers with scores and explanations

### Step 5 — Storage Advisor
Navigate to **Storage Advisor** → enter: Cotton, 20 qtl, 15 days
→ See: Sell Now ₹1,37,000 vs Store ₹1,39,900 (net gain ₹2,900) → Recommendation: Store

### Step 6 — Quality Grading
Navigate to **Quality Grading** → enter cotton parameters
→ Get: Grade A, Score 82/100, +5% price premium = ₹7,192/qtl

### Step 7 — Income Dashboard
Navigate to **My Income** → see total revenue, crop values, potential gain chart

### Step 8 — AI Assistant
Navigate to **AI Assistant** → type: *"I have 20 quintal cotton. Should I sell now?"*
→ IBM Granite responds using actual app data with reasoning and confidence

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL (optional in demo mode)
DATABASE_URL=postgresql://postgres:password@localhost:5432/agri_platform

# JWT
JWT_SECRET=your_super_secret_jwt_key

# IBM watsonx / Granite (optional — app works without these)
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-chat-v2

# Demo mode (set true to always use mock data)
DEMO_MODE=true
```

### Frontend (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEMO_MODE=true
```

---

## 🤖 IBM Granite / watsonx Configuration

1. Get credentials from [IBM watsonx.ai](https://dataplatform.cloud.ibm.com/)
2. Add to `backend/.env`:
   ```
   WATSONX_API_KEY=your_api_key
   WATSONX_PROJECT_ID=your_project_id
   ```
3. The app **automatically switches** from mock responses to real Granite responses
4. If credentials are invalid, the app **gracefully falls back** to mock — no crash

### What Granite is used for:
- Farmer-friendly explanations of price recommendations
- Storage sell/wait reasoning in plain English
- Buyer recommendation explanations
- Conversational assistant responses

### What Granite is NOT used for (deterministic instead):
- Price calculations
- Match scores
- Revenue estimates
- Distance calculations
- Grade scoring

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with phone + password |
| POST | `/api/auth/demo-login` | One-click demo login |
| POST | `/api/auth/register` | Register new user |

### Mandi Prices (Agent 1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mandi/prices?crop=Cotton&district=Rajkot` | Current prices |
| GET | `/api/mandi/historical?crop=Cotton&days=90` | Historical prices |
| GET | `/api/mandi/forecast?crop=Cotton` | Price forecast |

### Buyer Matching (Agent 2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matching/find-buyers` | Match buyers for a listing |

**Body:**
```json
{
  "crop": "Cotton",
  "quantityQuintals": 20,
  "qualityGrade": "A",
  "district": "Rajkot",
  "expectedPricePerQuintal": 7000
}
```

### Storage Advisor (Agent 3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/storage/analyze` | Storage vs sell analysis |

**Body:**
```json
{
  "crop": "Cotton",
  "quantityQuintals": 20,
  "storageDays": 15
}
```

### Quality Grading (Agent 4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quality/grade` | Grade crop quality |

**Form data:** `crop`, `stapleLength`, `micronaire`, `moisture`, `foreignMatter`, `colorGrade` (Cotton)
or `moisture`, `foreignMatter`, `damagedSeeds`, `oilContent`, `seedSize` (Groundnut)

### Income Dashboard (Agent 5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/farmer` | Farmer income dashboard |

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/chat` | Chat with IBM Granite assistant |

**Body:** `{ "message": "Should I sell my cotton now?" }`

---

## 🗄️ Database Schema

10 tables covering the full agricultural data model:
- `users` — Farmers and buyers
- `farmer_profiles` / `buyer_profiles` — Role-specific data
- `crops` — Cotton, Groundnut master data
- `mandis` — Gujarat APMC markets
- `mandi_prices` — Today's prices
- `historical_prices` — 90-day price history
- `farmer_listings` — Crop listings from farmers
- `buyer_requirements` — Purchase requirements from buyers
- `matches` — AI-generated farmer-buyer matches
- `transactions` — Completed deals
- `storage_records` — Crop storage tracking
- `quality_assessments` — Quality grading records
- `price_forecasts` — Cached AI forecasts

Seed data includes: 4 farmers, 4 buyers, 7 Gujarat mandis, 90 days of prices.

---

## 🏆 Buyer Match Score Formula

```
Match Score = Quality (25%) + Quantity (20%) + Price (30%) + Distance (15%) + Timeline (10%)
```

- **Quality**: Exact grade match = 100, adjacent = 80, two levels = 0
- **Quantity**: Within range = 100, partial fill = 50, too little = 20
- **Price**: Offered ≥ Expected = 90–100, below by 6%+ = <50
- **Distance**: ≤30km = 100, ≤80km = 85, ≤300km = 40
- **Timeline**: ≤7 days = 100, ≤14 days = 80

Every match includes a plain-English explanation.

---

## 🔒 Security

- JWT authentication (7-day expiry)
- Role-based access control (farmer/buyer/admin)
- Rate limiting (200 req/15 min)
- Helmet.js security headers
- CORS restricted to frontend origin
- Environment variables for all secrets (never hardcoded)
- Input validation on all routes
- Personal data masking (phone numbers shown as `98765xxxxx`)

---

## 📱 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Charts | Recharts |
| Routing | React Router v6 |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 15 |
| ORM | Raw pg (no ORM, full control) |
| AI LLM | IBM Granite 13B via watsonx.ai |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Security | Helmet, CORS, rate-limit |
| Deploy | Docker Compose (IBM Cloud ready) |

---

## ☁️ IBM Cloud Deployment

The architecture is designed for IBM Cloud deployment:

1. **IBM Code Engine** — Deploy backend and frontend as container apps
2. **IBM Databases for PostgreSQL** — Managed database
3. **IBM watsonx.ai** — Granite LLM integration (already wired)
4. **IBM Cloud Object Storage** — For crop quality images

Update `DATABASE_URL` and `WATSONX_*` env vars in IBM Code Engine configuration.

---

## 🚧 Known Limitations & Future Improvements

### Current Limitations
- Live mandi API not yet connected (uses realistic demo data)
- Computer vision quality grading uses rules (CV model slot ready)
- No payment/escrow system
- Mobile app not yet native (responsive web)

### Planned Improvements
- Connect real mandi APIs (Agmarknet, eNAM)
- Gujarati language UI
- Push notifications for price alerts
- UPI payment integration
- Trained CV model for cotton/groundnut quality
- Offline mode with service workers
- SMS interface for feature phone farmers
- Seasonal price forecasting with ML model

---

## 💡 Key Innovation Points

1. **Data-first, not chatbot-first** — Structured agricultural data drives decisions; LLM only explains
2. **Transparent AI** — Every recommendation shows its assumptions and score breakdown
3. **Graceful degradation** — Works without DB, without IBM API, without internet
4. **IBM Granite integration** — RAG-style: retrieves real prices, then asks Granite to explain
5. **Modular agent design** — Each of the 5 agents is independently upgradeable
6. **Farmer-centric UX** — Large text, ₹ pricing, quintal units, simple language

---

*Built with ❤️ for Indian farmers · Gujarat Hackathon 2026*
*IBM Bob · IBM watsonx Granite · Gujarat Agricultural Markets*
