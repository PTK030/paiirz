import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Layout } from "../components/ui/Layout";
import { AnimatedPage } from "../components/ui/AnimatedPage";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

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

const WelcomePage = () => {
  const [selectedFeature, setSelectedFeature] = useState<typeof featureDetails[0] | null>(null);

  return (
    <Layout maxWidthClass="max-w-6xl">
      <AnimatedPage className="flex flex-col items-center justify-center gap-12 my-auto">
        
        {/* Title & Headline */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl mt-4 sm:mt-12">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 leading-tight pb-3"
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
          <Link to="/chat" className="w-full block outline-none">
            <Button variant="primary" size="lg" fullWidth className="relative overflow-hidden group">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Rozpocznij konwersację
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </Button>
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl"
        >
          {featureDetails.map((feature, index) => (
            <div key={index} onClick={() => setSelectedFeature(feature)} className="w-full">
              <Card interactive glowColor="indigo" className="h-full group relative flex items-start gap-4">
                {/* Diagonal Arrow Indicator */}
                <div className="absolute top-4 right-4 text-zinc-600 opacity-35 group-hover:opacity-80 transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white shadow-inner group-hover:bg-zinc-800/80 transition-colors">
                  {feature.icon}
                </div>
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="text-sm font-semibold text-zinc-100">{feature.title}</h3>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {feature.description.substring(0, 110)}...
                  </p>
                </div>
              </Card>
            </div>
          ))}
        </motion.div>

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
                className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full flex flex-col gap-5 relative shadow-2xl"
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
                  <div className={`p-2.5 rounded-xl ${selectedFeature.bgClass} border flex items-center justify-center`}>
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
                  <Button variant="ghost" onClick={() => setSelectedFeature(null)} className="flex-1">
                    Zamknij
                  </Button>
                  <Link to="/chat" className="flex-1 block outline-none">
                    <Button variant="primary" fullWidth className="h-full">
                      Czat
                      <svg className="w-3.5 h-3.5 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </AnimatedPage>
    </Layout>
  );
};

export default WelcomePage;
