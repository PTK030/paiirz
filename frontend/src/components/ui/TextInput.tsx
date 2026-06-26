import React, { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  multiline?: false;
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  multiline: true;
}

export type InputProps = TextInputProps | TextAreaProps;

export const TextInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (props, ref) => {
    const { label, className = "", multiline, ...rest } = props;
    
    // Zunifikowane klasy dla inputów w całej aplikacji (styl neo-glass)
    const inputClasses = `w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl px-4 py-3 sm:py-3.5 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-300 focus:bg-zinc-900/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={props.id} className="text-xs text-zinc-400 font-medium ml-1">
            {label}
          </label>
        )}
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={`${inputClasses} resize-none`}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            className={inputClasses}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";
