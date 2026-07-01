import { Layout } from "../components/ui/Layout";
import { AnimatedPage } from "../components/ui/AnimatedPage";
import { Card } from "../components/ui/Card";

const Security = () => {
  return (
    <Layout showBackLink maxWidthClass="max-w-3xl">
      <AnimatedPage>
        <div className="flex flex-col gap-8">
          {/* Page Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              Bezpieczeństwo &amp; Prywatność
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Projektując komunikator paiirz, postawiliśmy bezpieczeństwo i całkowitą anonimowość na pierwszym miejscu. Każda rozmowa jest szyfrowana end-to-end - nawet my nie możemy jej odczytać.
            </p>
          </div>

          <div className="w-full h-[1px] bg-zinc-900" />

          {/* Security Principles */}
          <div className="flex flex-col gap-6">

            {/* Principle 1: E2EE */}
            <Card>
              <div className="flex items-center gap-3 text-indigo-400 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Szyfrowanie End-to-End (E2EE) - ECDH + AES-GCM 256</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Każda sesja czatu jest zabezpieczona szyfrowaniem end-to-end zbudowanym na kryptografii krzywych eliptycznych (ECDH P-256). Zaraz po sparowaniu, obie przeglądarki generują unikalne pary kluczy. Klucz prywatny <span className="text-zinc-300 font-medium">nigdy nie opuszcza Twojego urządzenia</span> - przez serwer przechodzi jedynie klucz publiczny. Na jego podstawie obie strony niezależnie wyprowadzają <span className="text-zinc-300 font-medium">ten sam tajny klucz AES-GCM 256-bit</span> (poprzez HKDF), którym szyfrowane są wiadomości, zdjęcia, nagrania głosowe i wideo. Każda wiadomość korzysta z unikalnego, losowego wektora IV. Serwer paiirz widzi wyłącznie zaszyfrowany szum - jest całkowicie ślepy na treść konwersacji.
              </p>
            </Card>

            {/* Principle 2: Zero-Knowledge IP */}
            <Card>
              <div className="flex items-center gap-3 text-violet-400 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Zero-Knowledge: adresy IP haszowane SHA-256 z solą</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Serwer paiirz <span className="text-zinc-300 font-medium">nigdy nie przechowuje surowego adresu IP</span> użytkownika. Przy każdym połączeniu adres IP i Peer ID są natychmiast haszowane algorytmem SHA-256 z unikalną, losową <em>solą kryptograficzną</em> generowaną w RAM przy każdym uruchomieniu serwera. Nawet przejęcie serwera przez atakującego nie ujawniłoby żadnego prawdziwego adresu IP. Hashe są używane wyłącznie do mechanizmu blokowania spamerów - i tylko w ulotnej pamięci operacyjnej.
              </p>
            </Card>

            {/* Principle 3: WebRTC P2P */}
            <Card>
              <div className="flex items-center gap-3 text-emerald-400 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Architektura P2P - rozmowy głosowe i wideo omijają serwer</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Połączenia głosowe i wideo realizowane są w technologii WebRTC bezpośrednio między Twoim urządzeniem a urządzeniem rozmówcy, bez pośrednictwa serwera paiirz. Strumień mediów jest dodatkowo szyfrowany protokołem DTLS-SRTP (wymóg standardu WebRTC). Serwer pełni jedynie rolę <em>ślepego przekaźnika sygnalizacji</em> (SDP, ICE) - nie ma dostępu do treści rozmowy.
              </p>
            </Card>

            {/* Principle 4: No Logging */}
            <Card>
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Zerowe logowanie - brak historii konwersacji</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Serwer paiirz nie zapisuje treści żadnej wiadomości na dysku. Przekazywany przez serwer szyfrogramm (ciphertext) istnieje jedynie w ulotnej pamięci RAM przez ułamek sekundy, niezbędny do przekazania go do odbiorcy. Po zakończeniu sesji lub zamknięciu karty, cała historia konwersacji jest trwale kasowana bez możliwości odtworzenia - po stronie zarówno serwera, jak i przeglądarki.
              </p>
            </Card>

            {/* Principle 5: Anti-Abuse */}
            <Card>
              <div className="flex items-center gap-3 text-amber-400 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Ochrona przed nadużyciami i ograniczanie spamu</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                System antynandużyciowy oparty jest wyłącznie na anonimowych hashach identyfikatorów - bez dostępu do prawdziwych danych użytkownika. Możesz zgłosić i zablokować dowolnego rozmówcę jednym kliknięciem. Mechanizm rate-limiting chroni przed zalewaniem wiadomościami (max 5 wiadomości na 3 sekundy). Blokada trwała uniemożliwia ponowne sparowanie z daną osobą w oparciu o hash Peer ID.
              </p>
            </Card>

          </div>

          {/* Comparison vs Messenger/Facebook */}
          <div className="w-full h-[1px] bg-zinc-900" />

          <Card>
            <h2 className="text-lg font-bold text-zinc-100 mb-4">paiirz vs. Messenger / Facebook</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-4 font-semibold text-zinc-300">Funkcja bezpieczeństwa</th>
                    <th className="text-center py-2 px-4 font-semibold text-indigo-400">paiirz</th>
                    <th className="text-center py-2 pl-4 font-semibold text-zinc-500">Messenger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  <tr>
                    <td className="py-2 pr-4">E2EE domyślnie dla wszystkich wiadomości</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓ Zawsze</td>
                    <td className="text-center py-2 pl-4 text-amber-500">Tylko „Tajne rozmowy" (opt-in)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">E2EE dla zdjęć i wideo</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓ Zawsze</td>
                    <td className="text-center py-2 pl-4 text-amber-500">Tylko „Tajne rozmowy"</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">E2EE dla nagrań głosowych</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓ Zawsze</td>
                    <td className="text-center py-2 pl-4 text-amber-500">Tylko „Tajne rozmowy"</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Brak przechowywania historii wiadomości na serwerze</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓</td>
                    <td className="text-center py-2 pl-4 text-rose-500">✗ (Meta przechowuje i analizuje)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Anonimowość - brak konta / rejestracji</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓ W pełni anonimowy</td>
                    <td className="text-center py-2 pl-4 text-rose-500">✗ Wymagane konto FB</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Zero-Knowledge haszowanie adresów IP</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓ SHA-256 + sól</td>
                    <td className="text-center py-2 pl-4 text-rose-500">✗ IP przechowywane jawnie</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Klucz prywatny nigdy nie opuszcza urządzenia</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓ Web Crypto API</td>
                    <td className="text-center py-2 pl-4 text-amber-500">Zależy od trybu</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Brak śledzenia, profilowania i reklam</td>
                    <td className="text-center py-2 px-4 text-emerald-400 font-bold">✓</td>
                    <td className="text-center py-2 pl-4 text-rose-500">✗ Model biznesowy oparty na danych</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed mt-4">
              * Powyższe porównanie dotyczy standardowych rozmów Messenger. Facebook/Meta potwierdził, że od 2023 roku stopniowo wdraża E2EE domyślnie dla prywatnych czatów - jednak nadal wymaga konta, loguje metadane i przetwarza dane na potrzeby reklam. W paiirz żadne z tych działań nie zachodzi.
            </p>
          </Card>

        </div>
      </AnimatedPage>
    </Layout>
  );
};

export default Security;
