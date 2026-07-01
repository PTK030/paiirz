# Refactoring Tracker - paiirz (Senior Developer Grade)

Cel: Transformacja kodu w ULTRA-HIPER-DUPER-SUPER czysty, profesjonalny projekt gotowy do pokazania rekruterom, z uwzględnieniem BEZPIECZEŃSTWA i OPTYMALIZACJI.

| Kategoria | Zadanie | Status | Uwagi |
|-----------|---------|--------|-------|
| **Faza 1: Konfiguracja i Wymuszanie Jakości (Tooling)** | | | |
| | Analiza obecnej konfiguracji (frontend + backend) | Do zrobienia | |
| | Instalacja i konfiguracja Prettier (frontend) | Do zrobienia | |
| | Ulepszenie ESLint (frontend) | Do zrobienia | |
| | Ulepszenie tsconfig (frontend) | Do zrobienia | |
| | (Opcjonalne) Dodanie Husky + lint-staged (frontend) | Do zrobienia | |
| | (Opcjonalne) Ulepszenie toolingu backendu | Do zrobienia | |
| **Faza 2: Bezpieczeństwo** | | | |
| | Dodanie walidacji Zod dla danych w `useLocalStorage.ts` | Do zrobienia | Dane z localStorage mogą być zmanipulowane! |
| | Dodanie walidacji Zod dla WSZYSTKICH wiadomości z socket.io | Do zrobienia | Waliduj WSZYSTKIE dane z zewnątrz! |
| | Dodanie sprawdzania typu i rozmiaru plików mediów | Do zrobienia | Ogranicz rozmiar np. do 10MB |
| | Dodanie safelisty URLi i walidacji obrazów/wideo | Do zrobienia | Tylko `data:` i zaufane URL-e! |
| | (Opcjonalne) Sprawdzenie konfiguracji CSP w Vite | Do zrobienia | |
| | Sprawdzenie walidacji danych na backendzie | Do zrobienia | |
| | Sprawdzenie konfiguracji rate limitingu na backendzie | Do zrobienia | |
| | Sprawdzenie, czy wrażliwe dane nie są w logach (backend) | Do zrobienia | |
| **Faza 3: Główna refaktoryzacja - Chat.tsx (PRIORYTET 1!)** | | | |
| | Wydzielenie `useSocket.ts` | Do zrobienia | Obecnie ~100 linii w Chat.tsx |
| | Wydzielenie `useRoom.ts` | Do zrobienia | Stan pokoju i matchmaking |
| | Wydzielenie `useChatMessages.ts` | Do zrobienia | Stan wiadomości |
| | Wydzielenie `usePrivateRoom.ts` | Do zrobienia | Logika prywatnych pokoi |
| | Wydzielenie `useMediaUpload.ts` | Do zrobienia | Logika przesyłania mediów |
| | Wydzielenie `useChatUI.ts` | Do zrobienia | Stan UI (menu, modale) |
| | Utworzenie `IncomingCallBanner.tsx` | Do zrobienia | Z renderu Chat.tsx |
| | Utworzenie `CallControls.tsx` | Do zrobienia | Z renderu Chat.tsx |
| | Usunięcie WSZYSTKICH `any` z Chat.tsx | Do zrobienia | |
| | Dodanie JSDoc do WSZYSTKICH funkcji w Chat.tsx | Do zrobienia | |
| | Wydzielenie magicznych liczb/stringów do `constants.ts` | Do zrobienia | |
| **Faza 4: Refaktoryzacja pozostałych plików frontend** | | | |
| | Sprawdzenie WSZYSTKICH hooków: JSDoc, typy, bez `any` | Do zrobienia | |
| | Sprawdzenie WSZYSTKICH komponentów: JSDoc, typy, bez `any` | Do zrobienia | |
| | Sprawdzenie WSZYSTKICH utilsów: JSDoc, typy, bez `any` | Do zrobienia | |
| | Utworzenie `constants.ts` i wydzielenie WSZYSTKICH stałych | Do zrobienia | |
| | Ulepszenie typów i dodanie schematów Zod | Do zrobienia | |
| **Faza 5: Refaktoryzacja backendu (jeśli trzeba)** | | | |
| | Przejrzenie kodu backendu | Do zrobienia | |
| | (Opcjonalne) Dodanie docstringów na backendzie | Do zrobienia | |
| | (Opcjonalne) Ulepszenie walidacji danych na backendzie | Do zrobienia | |
| **Faza 6: Optymalizacja** | | | |
| | Dodanie `React.memo` dla często renderowanych komponentów | Do zrobienia | |
| | Dodanie `useMemo` i `useCallback` gdzie to ma sens | Do zrobienia | |
| | Optymalizacja przechowywania mediów (URL.createObjectURL) | Do zrobienia | Oszczędność pamięci! |
| | Dodanie debouncing dla wskaźnika pisania | Do zrobienia | Mniej zdarzeń sieciowych! |
| | (Opcjonalne) Dodanie wirtualizacji listy wiadomości | Do zrobienia | Tylko jeśli wiadomości jest dużo! |
| | (Opcjonalne) Dodanie lazy loading dla dużych komponentów | Do zrobienia | |
| **Faza 7: Finalne sprzątanie i testowanie** | | | |
| | Uruchomienie ESLint i naprawa WSZYSTKICH błędów | Do zrobienia | |
| | Uruchomienie TypeScript check i naprawa WSZYSTKICH błędów | Do zrobienia | |
| | Uruchomienie testów i sprawdzenie, czy wszystkie przechodzą | Do zrobienia | |
| | Uruchomienie format:check i sprawdzenie | Do zrobienia | |
| | Testowanie manualne działania aplikacji | Do zrobienia | |
| | Testowanie bezpieczeństwa | Do zrobienia | |
| **Faza 8: Stworzenie profesjonalnego README.md** | | | |
| | Dodanie badges | Do zrobienia | React, TS, Vite, Tailwind, Flask, SocketIO, WebRTC, itp. |
| | Dodanie Hero Section z nazwą i sloganem | Do zrobienia | |
| | Dodanie miejsca na screenshots/GIFy | Do zrobienia | |
| | Dodanie sekcji Features z emoji | Do zrobienia | Wszystkie ważne cechy! |
| | Dodanie sekcji Tech Stack z linkami | Do zrobienia | |
| | Dodanie sekcji Getting Started | Do zrobienia | Jak zainstalować i uruchomić? |
| | Dodanie sekcji Project Structure | Do zrobienia | |
| | (Opcjonalne) Dodanie sekcji Contributing | Do zrobienia | |
| | Dodanie sekcji License | Do zrobienia | |
| | Dodanie sekcji Contact | Do zrobienia | |
| | Finalne sprawdzenie README (przejrzystość, styl) | Do zrobienia | Ma być profesjonalne i imponujące! |

