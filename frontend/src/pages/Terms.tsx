import { AnimatedPage } from "../components/ui/AnimatedPage";
import { Card } from "../components/ui/Card";
import { Layout } from "../components/ui/Layout";

/** @description Static "Terms of Service" page. */
const Terms = () => {
  return (
    <Layout showBackLink maxWidthClass="max-w-3xl">
      <AnimatedPage>
        <div className="flex flex-col gap-8">
          {/* Page Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              Regulamin Serwisu
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Korzystając z serwisu paiirz, akceptujesz poniższe proste i przejrzyste zasady mające
              na celu utrzymanie bezpiecznego środowiska rozmów.
            </p>
          </div>

          <div className="w-full h-[1px] bg-zinc-900" />

          {/* Terms Content */}
          <Card>
            <div className="flex flex-col gap-6 text-xs text-zinc-400 leading-relaxed">
              {/* Term 1 */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-zinc-200">1. Warunki ogólne</h3>
                <p>
                  Serwis paiirz udostępnia bezpłatną platformę do anonimowych rozmów tekstowych i
                  multimedialnych Peer-to-Peer. Korzystanie z serwisu nie wymaga podawania danych
                  osobowych ani rejestracji konta. Użytkownik zachowuje pełną anonimowość.
                </p>
              </div>

              {/* Term 2 */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-zinc-200">2. Niedozwolone zachowania</h3>
                <p>
                  Bezwzględnie zabrania się korzystania z serwisu w celu wysyłania spamu, linków
                  reklamowych, phishingu, nękania innych rozmówców, propagowania nienawiści oraz
                  udostępniania jakichkolwiek treści niezgodnych z obowiązującym prawem. Każde
                  zgłoszenie o zablokowanie analizowane jest automatycznie i skutkuje banem adresu
                  IP.
                </p>
              </div>

              {/* Term 3 */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-zinc-200">
                  3. Odpowiedzialność za przesyłane treści
                </h3>
                <p>
                  Komunikacja odbywa się bezpośrednio pomiędzy urządzeniami użytkowników (P2P). Z
                  tego powodu administracja serwisu nie monitoruje, nie zapisuje ani nie weryfikuje
                  przesyłanych wiadomości oraz mediów w czasie rzeczywistym. Wszelka wymiana danych
                  osobowych i kontaktów odbywa się wyłącznie na własną odpowiedzialność
                  użytkowników.
                </p>
              </div>

              {/* Term 4 */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-zinc-200">
                  4. Przerwy w świadczeniu usług
                </h3>
                <p>
                  Administracja zastrzega sobie prawo do czasowego wyłączenia serwera parującego w
                  celach konserwacyjnych oraz aktualizacji oprogramowania, dbając o jak najlepsze
                  dopasowywanie i jakość połączenia.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </AnimatedPage>
    </Layout>
  );
};

export default Terms;
