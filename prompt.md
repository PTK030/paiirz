# Master Refactoring Plan: paiirz (Senior Developer Grade)

Cel: Transformacja kodu w ULTRA-HIPER-DUPER-SUPER czysty, profesjonalny projekt gotowy do pokazania rekruterom, z uwzględnieniem BEZPIECZEŃSTWA i OPTYMALIZACJI.

---

## Przed rozpoczęciem: WYMAGANE KROKI ANALIZY

**Przed rozpoczęciem jakichkolwiek faz, AI MUSI:**
1. **Przeanalizować cały projekt (frontend + backend):**
   - Frontend: `frontend/src/`, `frontend/package.json`, `frontend/.eslintrc.cjs`, `frontend/tsconfig.json`
   - Backend: `backend/app/`, `backend/requirements.txt`, `backend/.env.example`
2. **Zrozumieć działanie aplikacji:**
   - Jak działa matchmaking?
   - Jak działa WebRTC?
   - Jak działa szyfrowanie E2EE?
   - Jak działają gry lodołamacze?
3. **Przeczytać `REFACTORING_TRACKER.md`** - zapoznać się z listą zadań
4. **Zapamiętać, że projekt jest mały** - nie używaj overkill'owych rozwiązań, ale trzymaj się zasad profesjonalnego kodu

---

## Żelazne Zasady (Core Principles)

Każda zmiana musi spełniać wszystkie te zasady:

### 1. SOLID Principles
- **S - Single Responsibility Principle**: Każdy plik, funkcja, komponent ma tylko JEDNĄ odpowiedzialność
- **O - Open/Closed Principle**: Otwarte na rozszerzenie, zamknięte na modyfikację
- **L - Liskov Substitution Principle**: Podtypy muszą być zastępowalne przez swoje typy bazowe
- **I - Interface Segregation Principle**: Wiele specyficznych interfejsów jest lepsze od jednego ogólnego
- **D - Dependency Inversion Principle**: Zależ od abstrakcji, nie od konkrecji

### 2. KISS (Keep It Simple, Stupid)
- Kod ma być prosty i przewidywalny
- Żadnych "sprytnych" tricków, które tylko autor rozumie
- Nowa osoba w zespole ma zrozumieć kod w 3 sekundach

### 3. DRY (Don't Repeat Yourself)
- Żadnego kopiuj-wklej
- Współdzielone komponenty → `components/ui/`
- Współdzielone hooki → `hooks/`
- Współdzielone utils → `utils/`

### 4. YAGNI (You Aren't Gonna Need It)
- Nie pisz abstrakcji "na zapas"
- Tylko co jest potrzebne TERAZ

### 5. Clean Code & Docs
- Jasne, opisowe nazwy zmiennych i funkcji (np. `isUserInRoom` zamiast `flag`)
- Brak magicznych liczb i stringów - WSZYSTKIE do `constants.ts`
- Każda funkcja biznesowa, hook i util ma JSDoc z:
  - `@description` - co funkcja robi
  - `@param` - opis parametrów
  - `@returns` - co zwraca
  - `@example` - przykład użycia (jeśli ma sens)
- Usuń wszystkie komentarze w kodzie, ale zostaw tylko te inline, które SERIO pomagają w interpretacji
- Poprawiaj niejasne nazwy zmiennych i funkcji
- Dziel duże pliki na mniejsze TYLKO WTEDY, gdy to ULEPSZY czytelność (bez przesady)

### 6. Konwencje nazewnictwa
- Komponenty: PascalCase (np. `ChatPage`, `MessageBubble`)
- Hooki: camelCase z prefiksem `use` (np. `useChatMessages`, `useSocket`)
- Pliki utils: camelCase (np. `crypto.ts`, `roomCode.ts`)
- Pliki typów: PascalCase z sufiksem `.types.ts` (lub w folderze `types/`)
- Stałe: UPPER_SNAKE_CASE (np. `MAX_FILE_SIZE_MB`, `E2EE_KEY_SIZE`)
- Folder: kebab-case (np. `chat/`, `games/`)

### 7. React Best Practices
- Używaj funkcyjnych komponentów z Hooks (nie klasowe!)
- Używaj `useMemo` i `useCallback` TYLKO GDY TO POTRZEBNE (nie przedwcześnie optymalizuj!)
- Używaj `React.memo` TYLKO DLA CZĘSTO RENDEROWANYCH KOMPONENTÓW
- Przekazuj tylko niezbędne propsy do komponentów
- Nie używaj indeksów jako kluczy w listach (używaj unikalnych ID!)
- Używaj Custom Hooks do wydzielania logiki biznesowej
- Cała logika w hookach, nie w komponentach (komponenty tylko do wyświetlania UI!)

### 8. TypeScript Best Practices
- WSZYSTKIE zmienne i funkcje mają typy (BEZ `any` - chyba, że naprawdę nie ma innego wyjścia i to z komentarzem!)
- Używaj `unknown` zamiast `any`
- Używaj `strict` mode w tsconfig
- Używaj typów generycznych gdzie to ma sens
- Używaj `zod` do walidacji runtime dla danych z zewnątrz (localStorage, socket, API)
- Wnioskowanie typów (type inference) to twoj przyjaciel, ale nie bój się jawnego określenia typów gdy to poprawia czytelność

### 9. Flask & SocketIO Best Practices (Backend)
- Trzymaj się zasad Flask (nie dodawaj niepotrzebnych zależności!)
- Waliduj WSZYSTKIE dane przychodzące z klienta (wtforms, pydantic, lub własna walidacja)
- Używaj middleware dla rate limitingu (już tam jest!)
- Nie ujawniaj wrażliwych danych w logach
- Trzymaj secret keys w zmiennych środowiskowych

### 10. WebSocket & WebRTC Best Practices
- Waliduj WSZYSTKIE wiadomości przychodzące z socket.io
- Dodaj timeout'y dla połączeń
- Obsługuj błędy połączeń (reconnect, itp.)
- Czujność z pamięcią - zwalniaj zasoby WebRTC po zakończeniu połączenia

---

## Architektura: Skalowalna, ale prosta (nie overkill dla małego projektu)

**Nie zmieniamy struktury!** Tylko ulepszamy kod i organizację w ramach istniejącej struktury.

```
paiirz/
├── backend/                # Flask backend (nie zmieniamy struktury, tylko ulepszamy kod!)
│   ├── app/
│   │   ├── controllers/
│   │   ├── data/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── config.py
│   │   └── extensions.py
│   ├── tests/
│   └── requirements.txt
│
└── frontend/               # React + Vite frontend
    ├── src/
    │   ├── pages/          # Strony (Home, Chat, Security, Terms, Contact)
    │   │   └── [Page].tsx  # TYLKO routing i orchestracja - BEZ logiki biznesowej!
    │   ├── components/
    │   │   ├── ui/         # Uniwersalne komponenty (Button, Card, Layout, itp.)
    │   │   ├── chat/       # Komponenty specyficzne dla czatu
    │   │   └── games/      # Komponenty gier lodołamaczy
    │   ├── hooks/          # WSZYSTKIE hooki (logika biznesowa)
    │   ├── utils/          # WSZYSTKIE utilsy (pomocnicze funkcje)
    │   ├── types/          # WSZYSTKIE typy
    │   ├── constants.ts    # Stałe (magiczne liczby/stringi)
    │   ├── App.tsx         # Główny komponent
    │   └── main.tsx        # Entry point
    ├── public/
    ├── package.json
    └── [config files]
```

### Odpowiedzialność warstw:
- **pages/**: Tylko routing, wywołanie hooków i renderowanie komponentów
- **components/**: Tylko UI - BEZ logiki biznesowej!
- **hooks/**: Cała logika biznesowa, zarządzanie stanem, integracje z bibliotekami
- **utils/**: Czyste funkcje, bez efektów ubocznych, które można testować w izolacji
- **types/**: WSZYSTKIE typy TypeScript i schematy Zod
- **constants.ts**: WSZYSTKIE stałe (nie ma magicznych liczb!)

---

## REFACTORING_TRACKER.md: Aktualizacja w real-time

AI MUSI na bieżąco aktualizować `REFACTORING_TRACKER.md`:
- Gdy zaczyna pracę nad zadaniem → zmień status na "W trakcie"
- Gdy zakończy pracę nad zadaniem → zmień status na "Zrobione"
- Dodaj uwagi, jeśli coś ważnego się stało (np. znaleziono buga, dodano test, itp.)

---

## Plan refaktoryzacji (kolejność ważności)

### Faza 1: Konfiguracja i Wymuszanie Jakości (Tooling)
**Cel:** Ustawić bramki, żeby brudny kod nie mógł przejść.
1. **Analiza obecnej konfiguracji:**
   - Frontend: `package.json`, `.eslintrc.cjs`, `tsconfig.json`
   - Backend: `requirements.txt`, `config.py`
2. **Instalacja i konfiguracja Prettier (frontend):**
   - Dodaj `.prettierrc` i `.prettierignore`
3. **Ulepszenie ESLint (frontend):**
   - Dodaj reguły TypeScript (`@typescript-eslint`)
   - Dodaj reguły importów (`eslint-plugin-import`)
   - Dodaj reguły React (`eslint-plugin-react`, `eslint-plugin-react-hooks`)
   - Dodaj reguły bezpieczeństwa (jeśli dostępne)
   - Dodaj integrację z Prettier
4. **Ulepszenie tsconfig (frontend):**
   - Włącz WSZYSTKIE strict opcje!
5. **(Opcjonalne) Dodanie Husky + lint-staged (frontend):**
   - Pre-commit hook: uruchamia ESLint i Prettier
6. **(Opcjonalne) Ulepszenie toolingu backendu:**
   - Dodaj `black` lub `autopep8` do formatowania
   - Dodaj `flake8` lub `pylint` do lintingu

### Faza 2: Bezpieczeństwo
**Cel:** Wygasić wszystkie potencjalne luki bezpieczeństwa.
1. **Frontend:**
   - Dodanie walidacji Zod dla danych z `useLocalStorage.ts`
   - Dodanie walidacji Zod dla WSZYSTKICH wiadomości przychodzących z socket.io
   - Dodanie sprawdzania typu i rozmiaru plików mediów przed przesłaniem
   - Dodanie safelisty URLi i walidacji przed wyświetlaniem obrazów/wideo
   - (Opcjonalne) Sprawdzenie konfiguracji CSP w Vite
2. **Backend:**
   - Sprawdzenie, czy wszystkie dane od klienta są walidowane
   - Sprawdzenie konfiguracji rate limitingu
   - Sprawdzenie, czy wrażliwe dane nie są w logach

### Faza 3: Główna refaktoryzacja - Chat.tsx (PRIORYTET NUMER 1!)
**Cel:** Rozbić 1000+ linii na mniejsze, czytelne części.
1. **Wydzielenie hooków:**
   - `useSocket.ts` - cała logika socket.io
   - `useRoom.ts` - stan pokoju, matchmaking
   - `useChatMessages.ts` - stan wiadomości, wysyłanie, odbieranie
   - `usePrivateRoom.ts` - logika prywatnych pokoi
   - `useMediaUpload.ts` - logika przesyłania obrazów/wideo/audio
   - `useChatUI.ts` - stan UI (menu, modale, itp.)
2. **Wydzielenie komponentów z renderu:**
   - `IncomingCallBanner.tsx` - baner z przychodzącym połączeniem
   - `CallControls.tsx` - kontrolki połączenia WebRTC
   - (Jeśli trzeba) inne małe komponenty
3. **Ulepszenie kodu:**
   - Usunięcie WSZYSTKICH `any`
   - Dodanie JSDoc do WSZYSTKICH funkcji
   - Wydzielenie magicznych liczb/stringów do `constants.ts`

### Faza 4: Refaktoryzacja pozostałych plików frontend
1. **Sprawdzenie wszystkich hooków:**
   - Dodanie JSDoc
   - Usunięcie `any`
   - Ulepszenie typowania
2. **Sprawdzenie wszystkich komponentów:**
   - Dodanie JSDoc
   - Usunięcie `any`
   - Ulepszenie typowania
   - (Jeśli trzeba) Dodanie `React.memo`
3. **Sprawdzenie wszystkich utilsów:**
   - Dodanie JSDoc
   - Usunięcie `any`
   - Ulepszenie typowania
4. **Utworzenie `constants.ts`:**
   - Wydzielenie WSZYSTKICH magicznych liczb i stringów
5. **Ulepszenie typów i dodanie Zod:**
   - Przejrzenie `types/message.ts` i `types/socket.ts`
   - Dodanie schematów Zod dla wszystkich typów danych z zewnątrz

### Faza 5: Refaktoryzacja backendu (jeśli trzeba)
1. **Przejrzenie kodu backendu:**
   - Czy jest czysty?
   - Czy są komentarze?
   - Czy jest walidacja danych?
2. **(Opcjonalne) Ulepszenie kodu backendu:**
   - Dodanie komentarzy/docstringów
   - Ulepszenie walidacji danych
   - Cokolwiek innego, co poprawia jakość

### Faza 6: Optymalizacja
**Cel:** Ulepszyć wydajność bez przesady.
1. **Frontend:**
   - Dodanie `React.memo` dla często renderowanych komponentów (np. `MessageBubble`)
   - Dodanie `useMemo` i `useCallback` gdzie to ma sens (nie przedwcześnie!)
   - Optymalizacja przechowywania mediów - rozważenie `URL.createObjectURL` zamiast Base64
   - Dodanie debouncing dla wskaźnika pisania
   - (Opcjonalne) Dodanie wirtualizacji listy wiadomości (np. `react-window`), tylko jeśli wiadomości jest dużo
   - (Opcjonalne) Dodanie lazy loading dla komponentów gier i innych dużych elementów
2. **Backend:**
   - (Opcjonalne) Sprawdzenie, czy nie ma wąskich gardeł

### Faza 7: Finalne sprzątanie i testowanie
**Cel:** Upewnić się, że wszystko jest idealne.
1. **Frontend:**
   - Uruchomienie `npm run lint` i naprawienie wszystkich błędów
   - Uruchomienie `npm run type-check` i naprawienie wszystkich błędów
   - Uruchomienie `npm run test` i sprawdzenie, czy wszystkie testy przechodzą
   - Uruchomienie `npm run format:check` i sprawdzenie, czy wszystko jest sformatowane
2. **Backend:**
   - (Opcjonalne) Uruchomienie testów
3. **Testowanie manualne:**
   - Uruchomienie aplikacji i sprawdzenie, czy wszystko działa tak jak przed refaktoryzacją
   - Testowanie bezpieczeństwa (np. próba wczytania niebezpiecznych danych)
4. **Aktualizacja `REFACTORING_TRACKER.md`:**
   - Wszystkie zadania powinny być "Zrobione"

### Faza 8: Stworzenie profesjonalnego README.md
**Cel:** Stworzyć README, które zrobi wrażenie na rekruterach, będzie ich szokowało, że ktoś coś tak zaawansowanego i profesjonalnego wykonał.

README MUSI mieć:
1. **Badges na początku:**
   - React
   - TypeScript
   - Vite
   - Tailwind CSS
   - Flask
   - Socket.IO
   - WebRTC
   - (Inne użyte technologie)
2. **Hero Section:**
   - Logo/nazwa projektu: `paiirz`
   - Slogan: `Połącz się. Porozmawiaj. Zniknij.`
   - Krótki opis, co to za projekt i jakie problemy rozwiązuje (3-4 zdania, w języku angielskim lub polskim - ale konsekwentnie!)
3. **Screenshots/GIFy:**
   - Ekran główny (Home)
   - Czat
   - Połączenie wideo/głosowe
   - Gry lodołamacze
   - (Jeśli nie masz screenshotów, napisz, że warto je dodać później)
4. **Features (Cechy):**
   - 🔒 **Pełna prywatność P2P** - Połączenie bez serwerów pośredniczących
   - 🕵️ **Szyfrowanie E2EE** - WSZYSTKIE wiadomości szyfrowane end-to-end
   - 💬 **Znikające wiadomości** - Wiadomości znikają po 5 sekundach
   - 🎮 **Gry lodołamacze** - "To czy Tamto", "Prawda czy Wyzwanie"
   - 📹 **Połączenia wideo/głosowe WebRTC**
   - 📍 **Matchmaking z filtrowaniem** - Wiek, płeć, lokalizacja
   - 🔑 **Prywatne pokoje z kodem**
   - 🛡️ **Wykrywanie zrzutów ekranu**
   - (Wszystkie inne ważne cechy)
5. **Tech Stack (Stos technologiczny):**
   - Lista wszystkich technologii z linkami do ich stron
6. **Getting Started (Pierwsze kroki):**
   - Jak sklonować repo
   - Jak zainstalować zależności (frontend + backend)
   - Jak skonfigurować zmienne środowiskowe
   - Jak uruchomić aplikację (frontend + backend)
7. **Project Structure (Struktura projektu):**
   - Krótki opis struktury
   - Dlaczego taka struktura?
8. **(Opcjonalne) Contributing:**
   - Jak można przyczynić się do projektu
9. **License:**
   - Informacja o licencji
10. **Contact (Kontakt):**
    - Twoje dane (GitHub, LinkedIn, itp.)

**Styl README:**
- Ma być przejrzysty
- Ma mieć emojis, żeby nie był nudny
- Ma być profesjonalny, ale nie za bardzo sztywny
- Ma pokazać, że to UNIKALNY projekt, który rozwiązuje PRAWDZIWE problemy
- (Ważne!) Ma być w jednym języku (najlepiej angielskim, ale jeśli wolisz polski - to konsekwentnie!)

---

## Ważne Uwagi Ogólne

1. **Nie ruszaj Git'a** - nie commituj, nie pushuj, nie rob nic z repo (chyba, że użytkownik jawnie poprosi)
2. **Nie zmieniaj działania aplikacji** - tylko refaktoryzacja, bez zmian funkcjonalności!
3. **Nie dodawaj nowych funkcji** - tylko co jest już
4. **Nie dodawaj niepotrzebnych zależności** (np. Zustand - nie jest potrzebny!)
5. **Nie zmieniaj architektury** - trzymaj się istniejącej struktury
6. **Aktualizuj `REFACTORING_TRACKER.md` na bieżąco**
7. **Bądź cierpliwy** - jakość ma być priorytetem, nie szybkość
8. **Jeśli czegoś nie wiesz - zapytaj użytkownika** - nie zgaduj!

---

## Komendy dla AI (Jak używać tego planu?)

Gdy użytkownik powie, żeby zacząć, postępuj według faz w kolejności:
1. Najpierw Faza 1 (Tooling)
2. Potem Faza 2 (Bezpieczeństwo)
3. Potem Faza 3 (Chat.tsx - najważniejsza!)
4. Potem Faza 4 (Reszta frontend)
5. Potem Faza 5 (Backend - jeśli trzeba)
6. Potem Faza 6 (Optymalizacja)
7. Potem Faza 7 (Sprzątanie i testowanie)
8. Potem Faza 8 (README)

**Przed każdą fazą - zapytaj użytkownika, czy chce kontynuować.**

**Po każdym zadaniu - zaktualizuj `REFACTORING_TRACKER.md`.**

**Jeśli czegoś nie wiesz - ZAPYTAJ UŻYTKOWNIKA, nie zgaduj!**

