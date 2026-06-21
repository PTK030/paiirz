import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -6 }
};

const pageTransition = {
  duration: 0.2,
  ease: "easeOut"
} as const;

const Terms = () => {
  return (
    <div className="min-h-full bg-[#09090B] text-zinc-100 flex flex-col px-6 sm:px-12 pt-6 sm:pt-8 pb-0 relative select-none font-sans overflow-hidden">
      
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[50%] -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-indigo-500/[0.04] blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-violet-600/[0.03] blur-[150px] pointer-events-none z-0" />

      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="flex-grow flex flex-col min-h-full w-full z-10"
      >
      
      {/* Header */}
      <Header showBackLink maxWidthClass="max-w-3xl" />

      {/* Main Content */}
      <main className="w-full max-w-3xl mx-auto flex-1 mt-8 sm:mt-16 mb-16 z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-8"
        >
          {/* Page Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              Regulamin Serwisu
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Korzystając z serwisu paiirz, akceptujesz poniższe proste i przejrzyste zasady mające na celu utrzymanie bezpiecznego środowiska rozmów.
            </p>
          </div>

          <div className="w-full h-[1px] bg-zinc-900" />

          {/* Terms Content */}
          <div className="flex flex-col gap-6 text-xs text-zinc-400 leading-relaxed">
            
            {/* Term 1 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-zinc-200">1. Warunki ogólne</h3>
              <p>
                Serwis paiirz udostępnia bezpłatną platformę do anonimowych rozmów tekstowych i multimedialnych Peer-to-Peer. Korzystanie z serwisu nie wymaga podawania danych osobowych ani rejestracji konta. Użytkownik zachowuje pełną anonimowość.
              </p>
            </div>

            {/* Term 2 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-zinc-200">2. Niedozwolone zachowania</h3>
              <p>
                Bezwzględnie zabrania się korzystania z serwisu w celu wysyłania spamu, linków reklamowych, phishingu, nękania innych rozmówców, propagowania nienawiści oraz udostępniania jakichkolwiek treści niezgodnych z obowiązującym prawem. Każde zgłoszenie o zablokowanie analizowane jest automatycznie i skutkuje banem adresu IP.
              </p>
            </div>

            {/* Term 3 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-zinc-200">3. Odpowiedzialność za przesyłane treści</h3>
              <p>
                Komunikacja odbywa się bezpośrednio pomiędzy urządzeniami użytkowników (P2P). Z tego powodu administracja serwisu nie monitoruje, nie zapisuje ani nie weryfikuje przesyłanych wiadomości oraz mediów w czasie rzeczywistym. Wszelka wymiana danych osobowych i kontaktów odbywa się wyłącznie na własną odpowiedzialność użytkowników.
              </p>
            </div>

            {/* Term 4 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-zinc-200">4. Przerwy w świadczeniu usług</h3>
              <p>
                Administracja zastrzega sobie prawo do czasowego wyłączenia serwera parującego w celach konserwacyjnych oraz aktualizacji oprogramowania, dbając o jak najlepsze dopasowywanie i jakość połączenia.
              </p>
            </div>

          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <Footer note="paiirz © 2026. Regulamin zaktualizowany w czerwcu 2026 r." maxWidthClass="max-w-3xl" />

      </motion.div>
    </div>
  );
};

export default Terms;
