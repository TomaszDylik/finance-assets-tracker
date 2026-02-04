-- ===========================================
-- Utwórz użytkownika testowego bezpośrednio
-- ===========================================
-- Uruchom to w Supabase SQL Editor jeśli nie możesz
-- potwierdzić emaila lub nie chcesz wyłączać weryfikacji

-- UWAGA: To działa tylko w Supabase Dashboard, nie w aplikacji!

-- Najpierw sprawdź czy użytkownik już nie istnieje
SELECT * FROM auth.users WHERE email = 'test@example.com';

-- Jeśli istnieje, usuń go:
-- DELETE FROM auth.users WHERE email = 'test@example.com';

-- Utwórz nowego użytkownika z hasłem i AUTO-POTWIERDŹ
-- To wymaga uprawnień admin w Supabase Dashboard

-- ŁATWIEJSZA METODA: 
-- Użyj GUI w Supabase:
-- 1. Wejdź do: Authentication -> Users
-- 2. Kliknij: "Add user" -> "Create new user"
-- 3. Email: test@example.com
-- 4. Password: Test123!@#
-- 5. ✅ ZAZNACZ: "Auto Confirm User"
-- 6. Kliknij: "Create user"

-- Po utworzeniu, zaloguj się w aplikacji:
-- Email: test@example.com
-- Password: Test123!@#
