# ⚠️ NAPRAW: "Email signups are disabled"

## Problem
Nie możesz się zarejestrować bo Supabase ma wyłączoną rejestrację przez email.

## ✅ ROZWIĄZANIE (2 minuty)

### Krok 1: Wejdź do Supabase
https://supabase.com/dashboard/project/lhjrymfkzszxezjvrruf/auth/providers

### Krok 2: Włącz Email Provider
1. Znajdź **"Email"** na liście providers
2. Kliknij na niego
3. **Włącz:** "Enable Email provider" ✅ (MUSI być zaznaczone!)
4. **WAŻNE dla developmentu:** Wyłącz "Confirm email" (aby nie musieć potwierdzać przez email)
5. Kliknij **SAVE** na dole strony

### Krok 3: Przetestuj
1. Wróć do http://localhost:3000
2. Kliknij "Get Started" lub "Register"
3. Wypełnij formularz
4. ✅ Powinno zadziałać!

---

## 🔧 Opcje konfiguracji Email Provider w Supabase

### Dla developmentu (ZALECANE):
```
✅ Enable Email provider: TAK
❌ Confirm email: NIE
✅ Enable email change confirmations: NIE (opcjonalne)
✅ Secure email change: TAK (opcjonalne)
```

### Dla produkcji:
```
✅ Enable Email provider: TAK
✅ Confirm email: TAK
✅ Enable email change confirmations: TAK
✅ Secure email change: TAK
```

---

## 📧 Jeśli chcesz weryfikację email

Wtedy WŁĄCZ "Confirm email" ale skonfiguruj SMTP:

1. **Project Settings** → **Auth** → **SMTP Settings**
2. Dodaj swoje dane SMTP (np. Gmail, SendGrid)
3. LUB użyj domyślnego Supabase SMTP (sprawdź spam!)

---

## ❓ Dalej nie działa?

### Sprawdź czy credentials są poprawne:

Plik `.env.local` powinien mieć:
```env
NEXT_PUBLIC_SUPABASE_URL=https://lhjrymfkzszxezjvrruf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twój-prawdziwy-anon-key
```

### Pobierz poprawny anon key:
1. https://supabase.com/dashboard/project/lhjrymfkzszxezjvrruf/settings/api
2. Skopiuj **"anon" / "public"** key (długi token JWT)
3. Wklej do `.env.local`
4. Restart serwera: `npm run dev`

---

## ✅ Po naprawie

Aplikacja będzie pokazywać lepsze komunikaty błędów, w tym:
- ❌ "Email registration is currently disabled" - gdy wyłączony email provider
- ❌ "This email is already registered" - gdy konto już istnieje
- ✅ "Account created!" - gdy sukces

Gotowe! 🎉
