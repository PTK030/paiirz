import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const featureDetails = [
  {
    title: "Pełna prywatność P2P",
    iconColor: "text-indigo-400",
    bgClass: "bg-indigo-500/10 border-indigo-500/20",
    icon: (
      <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    description: "Komunikator paiirz łączy Cię bezpośrednio z rozmówcą. Wszelkie wiadomości, zdjęcia i pliki wideo są przesyłane bezpośrednio z przeglądarki do przeglądarki (Peer-to-Peer), bez udziału jakichkolwiek serwerów pośredniczących w archiwizacji danych.",
    highlight: "Połączenie w pełni omija centralną infrastrukturę – nikt oprócz Was nie ma fizycznego dostępu do wysyłanych treści."
  },
  {
    title: "Znikające media",
    iconColor: "text-violet-400",
    bgClass: "bg-violet-500/10 border-violet-500/20",
    icon: (
      <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: "Zdjęcia, filmy oraz wiadomości głosowe ulegają automatycznemu zniszczeniu już 5 sekund po ich jednokrotnym otwarciu przez rozmówcę. Zapewnia to wysoki komfort przesyłania prywatnych materiałów.",
    highlight: "Komunikator posiada wbudowane wykrywanie prób zrobienia zrzutów ekranu, natychmiast zamykając podgląd."
  },
  {
    title: "Zaawansowane filtry",
    iconColor: "text-cyan-400",
    bgClass: "bg-cyan-500/10 border-cyan-500/20",
    icon: (
      <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    description: "Nie musisz tracić czasu na rozmowy z losowymi osobami o zupełnie odmiennych oczekiwaniach. Nasz algorytm dopasowywania umożliwia zawężenie kryteriów wyszukiwania.",
    highlight: "Filtruj partnerów według województw, konkretnych miast, przedziałów wiekowych oraz preferencji płciowych."
  },
  {
    title: "Gry lodołamacze",
    iconColor: "text-rose-400",
    bgClass: "bg-rose-500/10 border-rose-500/20",
    icon: (
      <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: "Zapomnij o niezręcznej ciszy i nudnych początkach. Oferujemy unikalny, zintegrowany z czatem moduł gier towarzyskich typu 'To czy Tamto' oraz 'Prawda czy Wyzwanie'.",
    highlight: "Gry możesz zaproponować w dowolnym momencie. Druga strona decyduje, czy chce dołączyć do zabawy."
  }
];

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -6 }
};

const pageTransition = {
  duration: 0.2,
  ease: "easeOut"
} as const;

const WelcomePage = () => {
  const [selectedFeature, setSelectedFeature] = useState<typeof featureDetails[0] | null>(null);

  return (
    <div className="min-h-full bg-[#09090B] text-zinc-100 flex flex-col px-6 sm:px-12 pt-6 sm:pt-8 pb-0 relative select-none font-sans overflow-hidden">
      
      {/* Background Cinematic Lighting Effects (Breathing/Pulsing Cyber Aurora) */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.06, 0.12, 0.06]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed top-[-10%] left-[20%] w-[600px] h-[350px] rounded-full bg-indigo-500 blur-[130px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.04, 0.09, 0.04]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-cyan-500 blur-[160px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          opacity: [0.015, 0.03, 0.015]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4),transparent_60%)] pointer-events-none z-0"
      />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181B_1px,transparent_1px),linear-gradient(to_bottom,#18181B_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-80 pointer-events-none" />

      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="flex-grow flex flex-col min-h-full w-full z-10"
      >

      {/* Top Navbar / Branding */}
      <Header maxWidthClass="max-w-6xl" />

      {/* Main Hero & Bento Layout */}
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-12 my-auto z-10 relative">
        
        {/* Title & Headline */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-300 leading-tight pb-3"
          >
            Połącz się. Porozmawiaj. Zniknij.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg"
          >
            Rozmawiaj bezpośrednio bez pośredników, rejestracji i śladów w sieci. Całkowicie prywatny czat z automatycznie wygasającymi wiadomościami.
          </motion.p>
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col items-center gap-4 w-full max-w-xs relative group"
        >
          {/* Subtle Outer Neon Glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-all duration-500 scale-95 group-hover:scale-105" />
          <Link
            to="/chat"
            className="w-full relative overflow-hidden bg-white text-zinc-950 font-bold py-4 px-6 rounded-2xl transition-all duration-300 cursor-pointer text-sm text-center tracking-wider hover:scale-[1.01] active:scale-[0.99] block outline-none border border-transparent"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-zinc-100 via-white to-zinc-100 opacity-0 hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center justify-center gap-2 text-zinc-950">
              Rozpocznij konwersację
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </Link>
        </motion.div>

        {/* Subtle click guide */}
        <div className="text-[10px] text-zinc-600 tracking-widest uppercase opacity-70 -mb-8">
          Kliknij kartę, aby poznać szczegóły
        </div>

        {/* Features Bento-style Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
        >
          {/* Card 1 */}
          <div 
            onClick={() => setSelectedFeature(featureDetails[0])}
            className="group relative bg-zinc-950/40 border border-zinc-800/60 p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 hover:border-indigo-500/30 hover:bg-zinc-900/10 hover:shadow-[0_0_30px_rgba(99,102,241,0.015)] shadow-lg cursor-pointer hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]"
          >
            {/* Diagonal Arrow Indicator */}
            <div className="absolute top-4 right-4 text-zinc-600 opacity-35 group-hover:opacity-80 transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white shadow-inner group-hover:bg-zinc-800/80 transition-colors">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex flex-col gap-1 pr-4">
              <h3 className="text-sm font-semibold text-zinc-100">Pełna prywatność</h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Połączenia realizowane bezpośrednio w architekturze P2P. Rozmowy nie są logowane ani zapisywane na serwerach zewnętrznych.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div 
            onClick={() => setSelectedFeature(featureDetails[1])}
            className="group relative bg-zinc-950/40 border border-zinc-800/60 p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 hover:border-violet-500/30 hover:bg-zinc-900/10 hover:shadow-[0_0_30px_rgba(139,92,246,0.015)] shadow-lg cursor-pointer hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]"
          >
            {/* Diagonal Arrow Indicator */}
            <div className="absolute top-4 right-4 text-zinc-600 opacity-35 group-hover:opacity-80 transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white shadow-inner group-hover:bg-zinc-800/80 transition-colors">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex flex-col gap-1 pr-4">
              <h3 className="text-sm font-semibold text-zinc-100">Znikające media</h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Przesyłaj zdjęcia, nagrania głosowe i wideo, które znikają bezpowrotnie 5 sekund po wyświetleniu przez odbiorcę.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => setSelectedFeature(featureDetails[2])}
            className="group relative bg-zinc-950/40 border border-zinc-800/60 p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 hover:border-cyan-500/30 hover:bg-zinc-900/10 hover:shadow-[0_0_30px_rgba(6,182,212,0.015)] shadow-lg cursor-pointer hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]"
          >
            {/* Diagonal Arrow Indicator */}
            <div className="absolute top-4 right-4 text-zinc-600 opacity-35 group-hover:opacity-80 transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white shadow-inner group-hover:bg-zinc-800/80 transition-colors">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div className="flex flex-col gap-1 pr-4">
              <h3 className="text-sm font-semibold text-zinc-100">Zaawansowane filtry</h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Wyszukuj partnerów do rozmowy według województw, miast, przedziałów wiekowych oraz określonych preferencji.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div 
            onClick={() => setSelectedFeature(featureDetails[3])}
            className="group relative bg-zinc-950/40 border border-zinc-800/60 p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 hover:border-rose-500/30 hover:bg-zinc-900/10 hover:shadow-[0_0_30px_rgba(244,63,94,0.015)] shadow-lg cursor-pointer hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]"
          >
            {/* Diagonal Arrow Indicator */}
            <div className="absolute top-4 right-4 text-zinc-600 opacity-35 group-hover:opacity-80 transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white shadow-inner group-hover:bg-zinc-800/80 transition-colors">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex flex-col gap-1 pr-4">
              <h3 className="text-sm font-semibold text-zinc-100">Gry lodołamacze</h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Ułatw sobie rozpoczęcie rozmowy. Korzystaj z wbudowanych gier i wyzwań prawda czy wyzwanie lub to czy tamto.
              </p>
            </div>
          </div>
        </motion.div>

      </main>

      {/* Footer */}
      <Footer maxWidthClass="max-w-6xl" />

      {/* Feature Explainer Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFeature(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 max-w-md w-full flex flex-col gap-5 relative shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedFeature(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-sm transition-colors cursor-pointer outline-none"
                title="Zamknij"
              >
                ✕
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${selectedFeature.bgClass} border border-transparent flex items-center justify-center`}>
                  {selectedFeature.icon}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {selectedFeature.title}
                </h3>
              </div>

              {/* Modal Description */}
              <div className="flex flex-col gap-4">
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                  {selectedFeature.description}
                </p>
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400 leading-relaxed flex items-start gap-2.5">
                  <svg className={`w-4 h-4 shrink-0 mt-0.5 ${selectedFeature.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{selectedFeature.highlight}</span>
                </div>
              </div>

              {/* Modal Footer CTA */}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-bold py-3.5 rounded-xl transition-all duration-200 text-xs text-center cursor-pointer outline-none"
                >
                  Zamknij
                </button>
                <Link
                  to="/chat"
                  className="flex-1 bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-3.5 rounded-xl transition-all duration-200 text-xs text-center cursor-pointer outline-none flex items-center justify-center gap-1.5 shadow-lg"
                >
                  Rozpocznij czat
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </motion.div>
    </div>
  );
};

export default WelcomePage;
