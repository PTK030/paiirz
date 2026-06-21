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

const Security = () => {
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
              Bezpieczeństwo & Prywatność
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Projektując komunikator paiirz, postawiliśmy bezpieczeństwo i całkowitą anonimowość na pierwszym miejscu. Zobacz, jak działają nasze systemy ochrony danych.
            </p>
          </div>

          <div className="w-full h-[1px] bg-zinc-900" />

          {/* Security Principles */}
          <div className="flex flex-col gap-6">
            
            {/* Principle 1 */}
            <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-3 text-indigo-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Architektura P2P (Signaling i WebRTC)</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Rozmowy realizowane są bezpośrednio między dwoma urządzeniami. Serwer paiirz służy wyłącznie do parowania użytkowników w pokoju czatowym. Gdy połączenie zostanie zestawione, strumień danych z wiadomościami i mediami omija serwer pośredniczący, płynąc bezpośrednio od Ciebie do rozmówcy.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="bg-zinc-950/40 border border-zinc-900/60 p-6 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-3 text-violet-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Zerowe logowanie danych</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Nigdy nie zapisujemy historii Twoich konwersacji na dyskach serwerowych. Wszystkie wiadomości przechowywane są wyłącznie w tymczasowej pamięci operacyjnej (RAM) Twojej przeglądarki. Po kliknięciu „Rozłącz się” lub zamknięciu karty, cała sesja jest trwale kasowana bez możliwości odzyskania.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-3 text-rose-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-100">Ochrona przed nadużyciami i złośliwym zachowaniem</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Wprowadziliśmy zaawansowany system przeciwdziałania nadużyciom. Możesz zgłosić i zablokować dowolnego rozmówcę jednym kliknięciem. Blokada zapisuje hash adresu IP na określony czas, uniemożliwiając spamerom i osobom naruszającym zasady ponowne połączenie z Tobą oraz innymi użytkownikami sieci.
              </p>
            </div>

          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <Footer note="paiirz © 2026. Rozmawiaj bezpiecznie i bez śladów." maxWidthClass="max-w-3xl" />

      </motion.div>
    </div>
  );
};

export default Security;
