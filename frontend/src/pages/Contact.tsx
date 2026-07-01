import { motion, AnimatePresence } from "framer-motion";
import type React from "react";
import { useState } from "react";

import { AnimatedPage } from "../components/ui/AnimatedPage";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Layout } from "../components/ui/Layout";
import { TextInput } from "../components/ui/TextInput";

/** How long the "message sent" confirmation stays visible before the form reappears (ms). */
const SUCCESS_MESSAGE_DURATION_MS = 5000;

/**
 * @description Contact page with a simple email + message form.
 *
 * Note: there is no backend endpoint wired up yet - `handleSubmit` only
 * simulates a successful send locally. Wiring this to a real contact/support
 * channel is a product decision outside the scope of this refactor.
 */
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
    }, SUCCESS_MESSAGE_DURATION_MS);
  };

  return (
    <Layout showBackLink maxWidthClass="max-w-3xl">
      <AnimatedPage>
        <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
          {/* Page Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              Skontaktuj się
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Masz pytania dotyczące bezpieczeństwa, uwagi, propozycje współpracy lub zauważyłeś
              błąd techniczny? Napisz do nas bezpośrednio.
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
              >
                <Card>
                  <div className="flex flex-col items-center gap-3 text-center py-4">
                    <div className="p-3 bg-indigo-900/20 border border-indigo-800/30 rounded-full text-indigo-400 shadow-inner">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-indigo-300">
                      Wiadomość została wysłana!
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                      Dziękujemy za kontakt. Postaramy się odpowiedzieć na Twój e-mail w przeciągu
                      24 godzin.
                    </p>
                  </div>
                </Card>
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
                <Card>
                  <div className="flex flex-col gap-4">
                    <TextInput
                      id="email"
                      type="email"
                      label="Twój adres e-mail"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="np. kontakt@twojadomena.pl"
                    />

                    <TextInput
                      id="message"
                      multiline
                      label="Treść wiadomości"
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Wpisz treść swojej wiadomości..."
                    />

                    <Button type="submit" variant="primary" fullWidth className="mt-2">
                      Wyślij wiadomość
                    </Button>
                  </div>
                </Card>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </AnimatedPage>
    </Layout>
  );
};

export default Contact;
