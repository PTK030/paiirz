import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
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

const Contact = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    
    // Simulate API request
    setIsSubmitted(true);
    setEmail("");
    setMessage("");

    setTimeout(() => {
      setIsSubmitted(false);
    }, 5000);
  };

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
      <main className="w-full max-w-lg mx-auto flex-1 mt-8 sm:mt-16 mb-16 z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-6"
        >
          {/* Page Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              Skontaktuj się
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Masz pytania dotyczące bezpieczeństwa, uwagi, propozycje współpracy lub zauważyłeś błąd techniczny? Napisz do nas bezpośrednio.
            </p>
          </div>

          <div className="w-full h-[1px] bg-zinc-900" />

          {/* Form / Success Notification */}
          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-emerald-950/20 border border-emerald-800/40 p-6 rounded-2xl flex flex-col items-center gap-3 text-center"
              >
                <div className="p-3 bg-emerald-900/20 border border-emerald-800/30 rounded-full text-emerald-400 shadow-inner">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-emerald-300">Wiadomość została wysłana!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                  Dziękujemy za kontakt. Postaramy się odpowiedzieć na Twój e-mail w przeciągu 24 godzin.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs text-zinc-400 font-medium">Twój adres e-mail</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="np. kontakt@twojadomena.pl"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded-xl px-4 py-3 text-sm text-zinc-200 transition-all placeholder-zinc-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="message" className="text-xs text-zinc-400 font-medium">Treść wiadomości</label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Wpisz treść swojej wiadomości..."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded-xl px-4 py-3 text-sm text-zinc-200 transition-all placeholder-zinc-700 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-white text-zinc-950 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer text-xs text-center tracking-wider hover:bg-zinc-100 hover:scale-[1.01] active:scale-[0.99] block outline-none mt-2"
                >
                  Wyślij wiadomość
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Footer */}
      <Footer note="paiirz © 2026. Skontaktujesz się również pod adresem support@paiirz.com." maxWidthClass="max-w-3xl" />

      </motion.div>
    </div>
  );
};

export default Contact;
