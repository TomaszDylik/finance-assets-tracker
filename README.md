# FinTrack - Futuristic Stock Portfolio Tracker

A modern, dark-themed stock portfolio tracker built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. Track your investments across stocks, ETFs, and crypto with real-time data from Yahoo Finance.

![FinTrack](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwindcss)

---

## 🇵🇱 SZYBKI START (po polsku)

### ⚡ 3 proste kroki:

#### 1. **Supabase** (https://supabase.com)
- Utwórz nowy projekt
- **WAŻNE:** Authentication → Providers → Email → **WYŁĄCZ "Confirm email"** ✅
- SQL Editor → Wklej cały `supabase/schema.sql` → Run

#### 2. **Dodaj credentials** do `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key
```
*(Znajdziesz w: Project Settings → API)*

#### 3. **Uruchom**:
```bash
npm install
npm run dev
```

Otwórz http://localhost:3000 → Kliknij "Get Started" → Zarejestruj się!

---

### ❓ Problemy?

#### ❌ "Policy already exists"
**Rozwiązanie:** `schema.sql` jest naprawiony - uruchom go ponownie (ma `DROP IF EXISTS`)

#### ❌ "Email not confirmed"
**Rozwiązanie:** Wyłącz weryfikację email w Supabase (krok 1 wyżej)

#### ❌ Nie mogę potwierdzić email
**Rozwiązanie A:** Wyłącz weryfikację email (zalecane dla dev)  
**Rozwiązanie B:** Utwórz użytkownika testowego w Supabase → Authentication → Users → Add user → ✅ "Auto Confirm User"

📖 **Więcej:** Zobacz `QUICK_START.md` lub `SETUP_GUIDE.md`

---

## ✨ Features

- 📊 **Real-time Portfolio Tracking** - Live stock prices from Yahoo Finance
- 💹 **Multi-Currency Support** - Track assets in USD, EUR, GBP, CHF, JPY, CZK with automatic PLN conversion
- 📈 **Performance Charts** - Interactive area charts with time range filters
- 🔄 **Smart Refresh** - 30-minute cooldown to prevent API abuse
- 🌙 **Dark Mode** - Beautiful glassmorphism design on #050505 background
- 📱 **Mobile-First** - Card view on mobile, table view on desktop
- 🔐 **Secure Auth** - Supabase authentication with Row Level Security

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd finance-assets-tracker
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from **Settings > API**

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── login/             # Login page
│   ├── register/          # Register page
│   └── dashboard/         # Main dashboard
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── add-transaction-modal.tsx
│   ├── asset-card.tsx    # Mobile card view
│   ├── asset-table.tsx   # Desktop table view
│   ├── asset-list.tsx    # Wrapper with filters
│   ├── portfolio-chart.tsx
│   ├── portfolio-summary.tsx
│   └── refresh-button.tsx
├── lib/                   # Utilities
│   ├── supabase/         # Supabase clients
│   ├── yahoo.ts          # Yahoo Finance API
│   ├── calculations.ts   # Portfolio math
│   └── constants.ts      # Configuration
├── actions/              # Server actions
├── hooks/                # Custom React hooks
├── providers/            # Context providers
└── types/                # TypeScript definitions
```

## 🎨 Design System

| Color       | Hex       | Usage               |
|-------------|-----------|---------------------|
| Background  | `#050505` | Main background     |
| Profit      | `#10b981` | Emerald (positive)  |
| Loss        | `#f43f5e` | Rose (negative)     |
| Glass       | 3% white  | Card backgrounds    |

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Shadcn UI](https://ui.shadcn.com/) - UI components
- [Supabase](https://supabase.com/) - Backend as a Service
- [Yahoo Finance](https://finance.yahoo.com/) - Market data
- [TanStack Query](https://tanstack.com/query) - Data fetching

