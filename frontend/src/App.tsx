import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Security from "./pages/Security";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";

const AnimatedRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    if (location.pathname === "/chat") {
      root.classList.remove("scroll-container");
    } else {
      root.classList.add("scroll-container");
    }
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/bezpieczenstwo" element={<Security />} />
        <Route path="/regulamin" element={<Terms />} />
        <Route path="/kontakt" element={<Contact />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
