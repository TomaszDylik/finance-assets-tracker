-- Finance Assets Tracker — Complete Database Setup
--
-- WARNING: This drops all existing tables and data.
--
-- Usage: Supabase Dashboard → SQL Editor → paste & run.

-- 1. Drop existing objects
DROP TABLE IF EXISTS cash_operations CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS closed_positions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 2. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Tables

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  base_currency TEXT DEFAULT 'PLN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  isin TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('STOCK','CRYPTO','ETF','BOND','COMMODITY')),
  asset_name TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY','SELL')),
  quantity DECIMAL(20,8) NOT NULL,
  price_per_share DECIMAL(20,8) NOT NULL,
  price_multiplier DECIMAL(20,8) NOT NULL DEFAULT 1.0,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate_to_pln DECIMAL(20,8) NOT NULL,
  fees DECIMAL(20,8) DEFAULT 0,
  notes TEXT,
  broker TEXT,
  is_closed BOOLEAN DEFAULT FALSE,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_ticker ON transactions(ticker);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

CREATE TABLE closed_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  isin TEXT,
  asset_type TEXT NOT NULL,
  asset_name TEXT,
  quantity_sold DECIMAL(20,8) NOT NULL,
  avg_buy_price_original DECIMAL(20,8) NOT NULL,
  avg_buy_exchange_rate DECIMAL(20,8) NOT NULL,
  sell_price DECIMAL(20,8) NOT NULL,
  sell_exchange_rate DECIMAL(20,8) NOT NULL,
  sell_transaction_id UUID REFERENCES transactions(id),
  realized_profit_pln DECIMAL(20,8) NOT NULL,
  broker TEXT,
  closed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_closed_positions_user_id ON closed_positions(user_id);
CREATE INDEX idx_closed_positions_ticker ON closed_positions(ticker);

CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value_pln DECIMAL(20,8) NOT NULL,
  total_invested_pln DECIMAL(20,8) NOT NULL,
  total_profit_pln DECIMAL(20,8) NOT NULL,
  assets_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date);

CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

CREATE TABLE cash_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('DEPOSIT','WITHDRAWAL','DIVIDEND','FEE','INTEREST','TAX')),
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  exchange_rate_to_pln DECIMAL(20,8) NOT NULL DEFAULT 1.0,
  description TEXT,
  symbol TEXT,
  broker TEXT,
  operation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_ops_user_id ON cash_operations(user_id);
CREATE INDEX idx_cash_ops_date ON cash_operations(operation_date);

-- 4. Row Level Security

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_operations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (SELECT / INSERT / UPDATE / DELETE per table)

DO $$ 
DECLARE
  tbl RECORD;
  col TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles','transactions','closed_positions',
      'portfolio_snapshots','watchlist','cash_operations'
    ]) AS name
  LOOP
    IF tbl.name = 'profiles' THEN col := 'id'; ELSE col := 'user_id'; END IF;
    
    EXECUTE format('CREATE POLICY "select_own" ON %I FOR SELECT USING (auth.uid() = %I)', tbl.name, col);
    EXECUTE format('CREATE POLICY "insert_own" ON %I FOR INSERT WITH CHECK (auth.uid() = %I)', tbl.name, col);
    EXECUTE format('CREATE POLICY "update_own" ON %I FOR UPDATE USING (auth.uid() = %I)', tbl.name, col);
    EXECUTE format('CREATE POLICY "delete_own" ON %I FOR DELETE USING (auth.uid() = %I)', tbl.name, col);
  END LOOP;
END $$;

-- 6. Functions & Triggers

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
