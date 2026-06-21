import { Link, useLocation } from "react-router-dom";

interface FooterProps {
  note?: string;
  maxWidthClass?: string;
}

const Footer = ({ note, maxWidthClass = "max-w-3xl" }: FooterProps) => {
  const location = useLocation();

  const defaultNote = "paiirz © 2026. Wszystkie rozmowy są w pełni prywatne i nie podlegają archiwizacji.";
  const displayNote = note || defaultNote;

  const isActive = (path: string) => location.pathname === path;

  return (
    <footer className={`w-full ${maxWidthClass} mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-900 pt-6 pb-6 sm:pb-8 text-xs text-zinc-600 z-10 select-none`}>
      <p className="text-center sm:text-left">{displayNote}</p>
      <div className="flex items-center gap-6">
        <Link 
          to="/bezpieczenstwo" 
          className={`transition-colors cursor-pointer outline-none ${
            isActive("/bezpieczenstwo") 
              ? "text-zinc-200 font-medium" 
              : "hover:text-zinc-400"
          }`}
        >
          Bezpieczeństwo
        </Link>
        <Link 
          to="/regulamin" 
          className={`transition-colors cursor-pointer outline-none ${
            isActive("/regulamin") 
              ? "text-zinc-200 font-medium" 
              : "hover:text-zinc-400"
          }`}
        >
          Regulamin
        </Link>
        <Link 
          to="/kontakt" 
          className={`transition-colors cursor-pointer outline-none ${
            isActive("/kontakt") 
              ? "text-zinc-200 font-medium" 
              : "hover:text-zinc-400"
          }`}
        >
          Kontakt
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
