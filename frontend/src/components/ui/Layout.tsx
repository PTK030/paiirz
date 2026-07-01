import type React from "react";

import Footer from "./Footer";
import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
  fullScreen?: boolean;
  hideHeader?: boolean;
  hideFooter?: boolean;
  maxWidthClass?: string;
  showBackLink?: boolean;
  className?: string;
}

/**
 * @description Shared page shell: background glows, optional header/footer,
 * and a centered content column. `fullScreen` opts out of the centered
 * max-width column and page padding for screens that need to fill the
 * viewport (e.g. the chat screen).
 */
export const Layout: React.FC<LayoutProps> = ({
  children,
  fullScreen = false,
  hideHeader = false,
  hideFooter = false,
  maxWidthClass = "max-w-3xl",
  showBackLink = false,
  className = "",
}) => {
  return (
    <div
      className={`bg-[#09090B] text-zinc-100 flex flex-col relative select-none font-sans overflow-hidden ${fullScreen ? "h-[100dvh]" : "min-h-full"} ${className}`}
    >
      {/* Background Static Glows - Consistent across all pages */}
      <div className="fixed top-[-10%] left-[50%] -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-indigo-500/[0.04] blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/[0.03] blur-[150px] pointer-events-none z-0" />

      {/* Main App Container */}
      <div
        className={`relative z-10 flex flex-col w-full h-full min-h-0 ${fullScreen ? "" : "px-6 sm:px-12 pt-6 sm:pt-8 overflow-y-auto scroll-container"}`}
      >
        {!hideHeader && <Header showBackLink={showBackLink} maxWidthClass={maxWidthClass} />}

        <main
          className={`flex-1 min-h-0 w-full mx-auto flex flex-col relative z-10 ${fullScreen ? "max-w-none" : `${maxWidthClass} mt-8 sm:mt-16 mb-16`}`}
        >
          {children}
        </main>

        {!hideFooter && !fullScreen && <Footer maxWidthClass={maxWidthClass} />}
      </div>
    </div>
  );
};
