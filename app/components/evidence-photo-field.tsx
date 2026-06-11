"use client";

import { useId, useRef, useState } from "react";

function IconCamera() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

type EvidencePhotoFieldProps = {
  name?: string;
  label: string;
  required?: boolean;
  capture?: "environment" | "user";
  className?: string;
  hint?: string;
  onFileChange?: (file: File | null) => void;
};

export function EvidencePhotoField({
  name,
  label,
  required = false,
  capture = "environment",
  className,
  hint = "Formatos: JPG, PNG o WEBP. Maximo 5MB por archivo (se optimiza automaticamente antes de enviar).",
  onFileChange,
}: EvidencePhotoFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className={className ?? "grid gap-2 md:col-span-2"}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        capture={capture}
        required={required}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setFileName(file?.name ?? null);
          onFileChange?.(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
        >
          <IconCamera />
          {fileName ? "Cambiar foto" : "Tomar o elegir foto"}
        </button>
        <span className="min-w-0 text-xs text-slate-500">
          {fileName ? (
            <span className="block truncate text-slate-700">{fileName}</span>
          ) : (
            "Sin foto seleccionada"
          )}
        </span>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}
