import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";

import Home from "./pages/Home";

// Code-split every route but the landing page - visitors shouldn't pay for
// Chat's WebRTC/E2EE/crypto bundle (by far the heaviest page) just to load "/".
const Chat = lazy(() => import("./pages/Chat"));
const Contact = lazy(() => import("./pages/Contact"));
const Security = lazy(() => import("./pages/Security"));
const Terms = lazy(() => import("./pages/Terms"));

/** @description App route table with page-transition animations keyed by pathname. */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={null}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/bezpieczenstwo" element={<Security />} />
          <Route path="/regulamin" element={<Terms />} />
          <Route path="/kontakt" element={<Contact />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

/** @description Application root: wraps the router around the animated route table. */
function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
