# ⚡ Szybki Start - 3 kroki

## 1️⃣ Supabase Setup

1. Wejdź na https://supabase.com i utwórz nowy projekt
2. Wyłącz weryfikację email:
   - **Authentication** → **Providers** → **Email**
   - **Wyłącz** "Confirm email"
   - Zapisz
3. Uruchom schema:
   - **SQL Editor** → Wklej cały plik `supabase/schema.sql`
   - Kliknij **Run**

## 2️⃣ Konfiguracja lokalna

Skopiuj dane z Supabase do `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key-z-project-settings-api
```

## 3️⃣ Uruchom aplikację

```bash
npm install
npm run dev
```

Otwórz http://localhost:3000

---

## 🎯 Rejestracja konta

Po wyłączeniu email confirmation:
- Kliknij "Get Started"
- Wypełnij formularz
- ✅ Automatycznie zalogowany!

---

## ❌ Rozwiązywanie problemów

### "Policy already exists"
➡️ Schema jest naprawiony - po prostu uruchom ponownie `schema.sql`

### "Email not confirmed"  
➡️ **Wyłącz** email confirmation w Supabase → Authentication → Providers → Email

### Nie działa Yahoo Finance API
➡️ To normalne - dane pobierają się dopiero po dodaniu transakcji

### Chcę konto testowe
➡️ W Supabase: Authentication → Users → Add user → **Zaznacz** "Auto Confirm User"

---

## 📊 Jak używać

1. Zaloguj się
2. Kliknij **"Add Transaction"**
3. Wyszukaj ticker (np. AAPL, MSFT, BTC-USD)
4. Dodaj transakcję BUY
5. Kliknij **"Refresh Prices"** żeby pobrać aktualne ceny

Gotowe! 🎉
