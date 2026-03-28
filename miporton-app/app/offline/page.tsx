export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-800">
      <h1 className="mb-2 text-2xl font-semibold text-blue-700">Sin conexión</h1>
      <p className="max-w-sm text-sm">
        No pudimos conectarnos a MiVisita. Revisa tu conexión a internet y vuelve a
        intentarlo.
      </p>
    </div>
  );
}

