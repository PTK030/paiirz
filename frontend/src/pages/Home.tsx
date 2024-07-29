import { Link } from "react-router-dom";

const WelcomePage = () => {
  return (
    <div className="h-screen bg-deep-navy-blue flex flex-col justify-center items-center">
      <div className="flex flex-col justify-center items-center flex-1">
        <h1 className="text-4xl sm:text-6xl tracking-tighter font-semibold text-slate-100 mb-4 text-center">
          Witaj w better 6obcy
        </h1>
        <p className="text-sm sm:text-lg text-slate-300 mb-8 text-center">
          Stwórz nowe znajomości klikając jeden przycisk!
        </p>
        <Link to={"/chat"} className="text-black font-medium bg-yellow-500 hover:bg-yellow-400 px-6 py-3 rounded-full transition-colors">Dołącz teraz!</Link>
      </div>
    </div>
  );
};

export default WelcomePage;
