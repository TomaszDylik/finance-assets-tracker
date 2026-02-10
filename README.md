# FinTrack — Portfolio Tracker

A dark-themed stock portfolio tracker built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, and **Supabase**. Track investments across stocks, ETFs, and crypto with real-time data from Yahoo Finance.

## Features

- **Real-time prices** — Live quotes via Yahoo Finance API
- **Multi-currency** — 28 currencies with automatic PLN conversion
- **Performance charts** — Interactive area charts with time-range filters
- **Transaction management** — Add, edit, delete individual transactions
- **Closed positions** — Realized P/L tracking for sold assets
- **Price anomaly detection** — Automatic GBX/ZAC/ILA sub-unit correction
- **Row Level Security** — Users see only their own data
- **Responsive design** — Card view on mobile, table view on desktop

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Framework  | Next.js 16 (App Router, Turbopack)      |
| Language   | TypeScript 5                            |
| Styling    | Tailwind CSS 4, Shadcn UI              |
| Database   | Supabase (PostgreSQL + Auth + RLS)      |
| Data       | Yahoo Finance via `yahoo-finance2`      |
| State      | TanStack React Query                    |
| Charts     | Recharts                                |
| Animation  | Framer Motion                           |

## Quick Start

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Disable email confirmation: **Authentication → Providers → Email → Confirm email: OFF**
3. Run `supabase/setup.sql` in the **SQL Editor**

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find credentials in **Project Settings → API**.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register, and start tracking.

## Project Structure

```
src/
├── actions/           Server actions (transactions, portfolio, search)
├── app/               Next.js App Router pages
│   ├── dashboard/     Main dashboard
│   ├── login/         Authentication
│   └── register/
├── components/        React components
│   └── ui/            Shadcn UI primitives
├── hooks/             Custom React hooks
├── lib/               Utilities
│   ├── supabase/      Supabase client/server/middleware
│   ├── calculations.ts
│   ├── constants.ts
│   ├── price-multiplier.ts
│   └── yahoo.ts
├── providers/         Context providers (auth, query)
├── types/             TypeScript type definitions
└── proxy.ts           Auth session management
```

## License

MIT

