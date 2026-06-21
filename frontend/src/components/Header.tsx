import { Link } from "react-router-dom";

interface HeaderProps {
  showBackLink?: boolean;
  maxWidthClass?: string;
}

const Header = ({ showBackLink = false, maxWidthClass = "max-w-3xl" }: HeaderProps) => {
  return (
    <header className={`w-full ${maxWidthClass} mx-auto flex items-center justify-between z-10 select-none`}>
      <Link to="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity outline-none">
        paiirz
      </Link>
      {showBackLink && (
        <Link 
          to="/" 
          className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group outline-none"
        >
          <svg 
            className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Wróć do strony głównej
        </Link>
      )}
    </header>
  );
};

export default Header;
