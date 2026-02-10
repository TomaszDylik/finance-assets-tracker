<div align="center">

# FinTrack

**A privacy-first, multi-currency investment dashboard.**

Track international stocks, ETFs, and crypto — with real-time prices, automatic currency conversion, and S&P 500 benchmarking.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20App-emerald?style=for-the-badge)](https://finance-assets-tracker-bp6a.vercel.app/)

![Dashboard Screenshot](/public/screenshot.png)

</div>

---

## The Problem

Investing in international stocks using a local currency account (e.g., buying US Tech with PLN) creates a hidden math problem. Your brokerage shows the stock's price in USD, but you paid in PLN — and the exchange rate on the day you bought it is different from today. **Most trackers ignore this entirely.**

FinTrack solves this by triangulating historical exchange rates to show your **true profit in your base currency** — accounting for both asset price movements and currency fluctuations on a single timeline.

## Key Features

| | Feature | Description |
|---|---|---|
| 🚀 | **Real-Time Data** | Live stock, ETF, and crypto prices powered by the Yahoo Finance API — updated on every dashboard visit. |
| 💱 | **Smart Currency Engine** | Decouples *Asset Currency* (e.g., USD) from *Settlement Currency* (e.g., PLN) to calculate precise historical cost basis using the exchange rate from the purchase date. |
| 📊 | **Alpha Benchmarking** | Compare your personal portfolio's cumulative return directly against the S&P 500 index on a single chart. See your alpha in percentage points. |
| 📈 | **Zero-Based Charting** | A split-gradient visualization showing Cumulative Return % relative to a 0% break-even line — green when you profit, red when you lose. |
| 🔒 | **Privacy First** | All financial data is stored securely in your own Supabase instance with Row Level Security. No third-party analytics, no data sharing. |
| 🌍 | **28 Currencies** | Support for USD, EUR, GBP, CHF, JPY, PLN, and 22 more — with automatic sub-unit correction (GBX → GBP, ZAC → ZAR). |

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, Shadcn UI |
| **Animation** | Framer Motion |
| **Visualization** | Recharts (custom `ComposedChart` with split-gradient `Area` + `Line` overlay) |
| **State Management** | TanStack React Query v5 |
| **Backend & Auth** | Supabase (PostgreSQL + Auth + RLS) |
| **Market Data API** | `yahoo-finance2` |
| **Deployment** | Vercel |

## Quick Start

### Use the Live App

The fastest way to try FinTrack:

1. Open the **[Live Demo](https://finance-assets-tracker-bp6a.vercel.app/)**.
2. Create a secure account (email + password).
3. Click **"Add Transaction"**.
4. Search for a stock by name (e.g., *Apple*) or ticker (e.g., `NVDA`, `PKO.WA`).
5. Enter the purchase price in the **asset's original currency** (e.g., USD).
6. Select the **settlement currency** — the currency you actually paid with (e.g., PLN).
7. Analyze your performance on the dashboard and toggle **"vs S&P 500"** to see if you're beating the market.

### Run Locally

<details>
<summary>Click to expand local setup instructions</summary>

#### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Disable email confirmation: **Authentication → Providers → Email → Confirm email: OFF**.
3. Run `supabase/setup.sql` in the **SQL Editor**.

#### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials (found in **Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register to start tracking.

</details>

## How It Works

```
User adds a transaction:  NVDA · 10 shares · $950 USD · paid in PLN · 2025-03-15
                                        │
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
               Yahoo Finance     Historical FX      Supabase DB
              (live NVDA price)  (USD/PLN on 2025-03-15)  (secure storage)
                        │               │               │
                        └───────┬───────┘               │
                                ▼                       │
                     Cost Basis in PLN: 38,380 PLN      │
                     Current Value: 41,200 PLN          │
                     Return: +7.35%                     │
                     vs S&P 500: +2.1 pp alpha          │
                                ▼                       │
                        ┌───────────────┐               │
                        │   Dashboard   │◄──────────────┘
                        │  Split-Gradient Chart         │
                        │  Portfolio Summary            │
                        │  Asset Breakdown              │
                        └───────────────┘
```

## Project Structure

```
src/
├── actions/            Server actions (transactions, portfolio, ticker search)
├── app/                Next.js App Router pages
│   ├── dashboard/      Main dashboard (portfolio view)
│   ├── login/          Authentication
│   └── register/
├── components/         React components
│   ├── ui/             Shadcn UI primitives (Dialog, Tabs, Button, etc.)
│   ├── portfolio-history-chart.tsx   Split-gradient cumulative return chart
│   ├── portfolio-summary.tsx         KPI cards (value, return, daily change)
│   ├── asset-list.tsx                Per-asset breakdown with live P/L
│   ├── onboarding-wizard.tsx         First-visit guided tour
│   └── user-manual-modal.tsx         In-app help with tabbed content
├── hooks/              Custom hooks (portfolio history, benchmark simulation, cooldowns)
├── lib/
│   ├── supabase/       Supabase client, server client, middleware helpers
│   ├── calculations.ts Holdings aggregation, live data merging, summary stats
│   ├── price-multiplier.ts  Sub-unit correction (GBX→GBP, ZAC→ZAR, ILA→ILS)
│   └── yahoo.ts        Yahoo Finance server actions (quotes, FX, historical, benchmark)
├── providers/          Context providers (Auth, React Query)
├── types/              TypeScript interfaces and type definitions
└── proxy.ts            Next.js 16 auth session management
```

## Screenshots

| Dashboard | Empty State |
|---|---|
| ![Dashboard](/public/screenshot-dashboard.png) | ![Empty State](/public/screenshot-empty.png) |

| Benchmark Chart | Add Transaction |
|---|---|
| ![Chart](/public/screenshot-chart.png) | ![Add](/public/screenshot-add.png) |

## License

MIT

