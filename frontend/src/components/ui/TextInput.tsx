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

export const TextInput = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>((props, ref) => {
  const { label, className = "", multiline, ...rest } = props;

  // Zunifikowane klasy dla inputów w całej aplikacji (styl neo-glass)
  const inputClasses = `w-full appearance-none bg-zinc-900/60 border border-zinc-800/80 rounded-2xl px-4 py-3 sm:py-3.5 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 outline-none focus:outline-none focus-visible:outline-none transition-colors duration-200 focus:bg-zinc-900/80 focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed [-webkit-tap-highlight-color:transparent] ${className}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={props.id}
          className="text-xs text-zinc-400 font-medium ml-1"
        >
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
});

TextInput.displayName = "TextInput";
