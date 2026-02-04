-- ===========================================
-- Finance Assets Tracker - Supabase Database Schema
-- ===========================================
-- Run this SQL in your Supabase SQL Editor
-- https://app.supabase.com → Your Project → SQL Editor → New Query
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. PROFILES TABLE
-- Stores user profile information
-- ===========================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    base_currency TEXT DEFAULT 'PLN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ===========================================
-- 2. TRANSACTIONS TABLE
-- Stores all buy/sell transactions
-- ===========================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Asset Information
    ticker TEXT NOT NULL,                    -- e.g., "AAPL", "PKO.WA", "BTC-USD"
    asset_type TEXT NOT NULL CHECK (asset_type IN ('STOCK', 'CRYPTO', 'ETF', 'BOND', 'COMMODITY')),
    asset_name TEXT,                         -- e.g., "Apple Inc.", "PKO Bank Polski"
    
    -- Transaction Details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    quantity DECIMAL(20, 8) NOT NULL,        -- Supports fractional shares (up to 8 decimals for crypto)
    price_per_share DECIMAL(20, 8) NOT NULL, -- Price in original currency
    
    -- Currency Information
    currency TEXT NOT NULL DEFAULT 'USD',    -- Original currency (USD, PLN, EUR, GBP, etc.)
    exchange_rate_to_pln DECIMAL(20, 8) NOT NULL, -- Manual input by user at time of purchase
    
    -- Additional Info
    fees DECIMAL(20, 8) DEFAULT 0,           -- Transaction fees
    notes TEXT,                              -- User notes
    
    -- Timestamps
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- ===========================================
-- 3. CLOSED POSITIONS TABLE
-- Stores realized profit/loss from SELL transactions
-- ===========================================
CREATE TABLE IF NOT EXISTS closed_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Asset Information
    ticker TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    
    -- Position Details
    quantity_sold DECIMAL(20, 8) NOT NULL,
    
    -- Average Buy Price (at time of sale)
    avg_buy_price_original DECIMAL(20, 8) NOT NULL,  -- In original currency
    avg_buy_exchange_rate DECIMAL(20, 8) NOT NULL,   -- Weighted avg exchange rate
    
    -- Sell Details
    sell_price DECIMAL(20, 8) NOT NULL,              -- In original currency
    sell_exchange_rate DECIMAL(20, 8) NOT NULL,      -- Exchange rate at sale
    sell_transaction_id UUID REFERENCES transactions(id),
    
    -- Calculated Profit/Loss in PLN
    realized_profit_pln DECIMAL(20, 8) NOT NULL,
    
    -- Timestamps
    closed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_closed_positions_user_id ON closed_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_closed_positions_ticker ON closed_positions(ticker);

-- ===========================================
-- 4. PORTFOLIO SNAPSHOTS TABLE
-- Daily snapshots for historical charts
-- ===========================================
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    snapshot_date DATE NOT NULL,
    total_value_pln DECIMAL(20, 8) NOT NULL,
    total_invested_pln DECIMAL(20, 8) NOT NULL,
    total_profit_pln DECIMAL(20, 8) NOT NULL,
    
    -- Asset breakdown (JSON for flexibility)
    assets_breakdown JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, snapshot_date)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date);

-- ===========================================
-- 5. WATCHLIST TABLE
-- User's watchlist for tracking stocks
-- ===========================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    asset_name TEXT,
    target_price DECIMAL(20, 8),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, ticker)
);

-- ===========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Closed positions policies
DROP POLICY IF EXISTS "Users can view own closed positions" ON closed_positions;
CREATE POLICY "Users can view own closed positions" ON closed_positions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own closed positions" ON closed_positions;
CREATE POLICY "Users can insert own closed positions" ON closed_positions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Portfolio snapshots policies
DROP POLICY IF EXISTS "Users can view own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can view own snapshots" ON portfolio_snapshots
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can insert own snapshots" ON portfolio_snapshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can update own snapshots" ON portfolio_snapshots
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can delete own snapshots" ON portfolio_snapshots
    FOR DELETE USING (auth.uid() = user_id);

-- Watchlist policies
DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
CREATE POLICY "Users can view own watchlist" ON watchlist
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own watchlist" ON watchlist;
CREATE POLICY "Users can manage own watchlist" ON watchlist
    FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- 7. FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for transactions updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 8. SAMPLE DATA (Optional - for testing)
-- Uncomment if you want sample data
-- ===========================================

/*
-- Note: Replace 'YOUR-USER-UUID-HERE' with an actual user ID from auth.users

INSERT INTO transactions (user_id, ticker, asset_type, asset_name, transaction_type, quantity, price_per_share, currency, exchange_rate_to_pln, transaction_date)
VALUES
    ('YOUR-USER-UUID-HERE', 'AAPL', 'STOCK', 'Apple Inc.', 'BUY', 10, 175.50, 'USD', 4.20, '2024-01-15'),
    ('YOUR-USER-UUID-HERE', 'AAPL', 'STOCK', 'Apple Inc.', 'BUY', 5, 185.00, 'USD', 4.15, '2024-03-20'),
    ('YOUR-USER-UUID-HERE', 'PKO.WA', 'STOCK', 'PKO Bank Polski', 'BUY', 100, 45.50, 'PLN', 1.00, '2024-02-10'),
    ('YOUR-USER-UUID-HERE', 'MSFT', 'STOCK', 'Microsoft Corporation', 'BUY', 8, 380.00, 'USD', 4.18, '2024-04-05'),
    ('YOUR-USER-UUID-HERE', 'BTC-USD', 'CRYPTO', 'Bitcoin', 'BUY', 0.5, 42000.00, 'USD', 4.22, '2024-01-20');
*/

-- ===========================================
-- DONE! Your database is ready.
-- ===========================================
