"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  id?: string;
  autoComplete?: string;
};

export function PasswordField({
  name,
  placeholder,
  required,
  defaultValue,
  id,
  autoComplete,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;

  return (
    <div className="flex items-center gap-2">
      <input
        id={inputId}
        name={name}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="field-base"
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
        title={showPassword ? "Ocultar password" : "Mostrar password"}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        {showPassword ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M10.584 10.587A2 2 0 0012 14a2 2 0 001.413-3.416M9.88 5.09A10.94 10.94 0 0112 5c4.5 0 8.269 2.943 9.543 7a10.958 10.958 0 01-4.177 5.595M6.228 6.228C4.043 7.401 2.31 9.45 1.457 12A10.965 10.965 0 006.54 17.523"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M1.457 12C2.732 7.943 6.5 5 12 5s9.269 2.943 10.543 7c-1.274 4.057-5.043 7-10.543 7S2.732 16.057 1.457 12z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
