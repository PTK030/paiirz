import React, { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "secondary", size = "md", fullWidth = false, children, ...props }, ref) => {
    
    // Base classes
    const baseClasses = "inline-flex items-center justify-center font-bold transition-all duration-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0";
    
    // Variant classes
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-[0.98]",
      secondary: "bg-white text-zinc-950 hover:bg-zinc-100 shadow-md hover:shadow-lg active:scale-[0.98]",
      danger: "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-95",
      ghost: "bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 active:scale-95",
      glass: "bg-zinc-900/80 border border-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-800 backdrop-blur-md shadow-lg active:scale-[0.98]"
    };

    // Size classes
    const sizes = {
      sm: "py-2 px-4 text-xs rounded-xl",
      md: "py-3 px-6 text-sm rounded-2xl",
      lg: "py-4 px-8 text-base rounded-[1.5rem]",
      icon: "p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem]"
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
