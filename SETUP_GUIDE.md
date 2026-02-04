# 🚀 Setup Guide - FinTrack

## Problem z Email Confirmation?

Supabase domyślnie wymaga potwierdzenia emaila. Masz 3 opcje:

### ✅ Opcja 1: Wyłącz weryfikację email (ZALECANE dla developmentu)

1. Wejdź na [supabase.com](https://supabase.com) → Twój projekt
2. **Authentication** → **Providers** → **Email**
3. Wyłącz **"Confirm email"**
4. Kliknij **Save**

Teraz możesz się rejestrować bez potwierdzania email!

---

### Opcja 2: Użyj konta testowego

Utwórz użytkownika bezpośrednio w Supabase:

1. Wejdź do **Authentication** → **Users**
2. Kliknij **Add user** → **Create new user**
3. Email: `test@example.com`
4. Password: `Test123!@#`
5. **Auto Confirm User**: ✅ ZAZNACZ to pole!
6. Kliknij **Create user**

Teraz zaloguj się:
- Email: `test@example.com`
- Password: `Test123!@#`

---

### Opcja 3: Sprawdź spam/skonfiguruj email

Jeśli chcesz używać prawdziwych emaili:

1. Sprawdź folder SPAM w emailu
2. Lub skonfiguruj własny SMTP w Supabase:
   - **Project Settings** → **Auth** → **SMTP Settings**

---

## 🛠️ Napraw błąd SQL Schema

Jeśli podczas uruchamiania `schema.sql` dostajesz błędy "already exists":

### Rozwiązanie A: Usuń i utwórz ponownie

```sql
-- Uruchom to w SQL Editor w Supabase PRZED schema.sql:
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS closed_positions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
```

Potem uruchom cały `supabase/schema.sql`.

### Rozwiązanie B: Użyj nowego schema.sql

Zaktualizowany `schema.sql` zawiera już `DROP IF EXISTS` - po prostu uruchom go ponownie.

---

## ✅ Quick Start

1. **Skonfiguruj Supabase:**
   - Utwórz projekt na [supabase.com](https://supabase.com)
   - Wyłącz email confirmation (Authentication → Providers → Email)
   - Uruchom `supabase/schema.sql` w SQL Editor

2. **Dodaj credentials do .env.local:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key
   ```

3. **Uruchom aplikację:**
   ```bash
   npm run dev
   ```

4. **Zarejestruj się:**
   - Otwórz http://localhost:3000
   - Kliknij "Get Started"
   - Wypełnij formularz rejestracji
   - Jeśli email confirmation wyłączony → od razu zalogowany ✅
   - Jeśli włączony → sprawdź email/spam

---

## 🐛 Najczęstsze problemy

### "Policy already exists"
➡️ Uruchom zaktualizowany `schema.sql` - teraz używa `DROP IF EXISTS`

### "Email not confirmed"
➡️ Wyłącz email confirmation w Supabase Auth settings

### "Invalid credentials"
➡️ Sprawdź czy użytkownik istnieje w Authentication → Users

### "Cannot read properties of null"
➡️ Sprawdź czy `.env.local` ma poprawne credentials

---

## 📧 Potrzebujesz pomocy?

1. Sprawdź logi w Supabase: **Logs** → **Auth Logs**
2. Sprawdź konsolę przeglądarki (F12)
3. Sprawdź czy tabele istnieją: **Table Editor**
