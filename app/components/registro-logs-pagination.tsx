import Link from "next/link";

type RegistroLogsPaginationProps = {
  basePath: string;
  /** Query params to preserve (omit logPage; empty values skipped). */
  params: Record<string, string>;
  page: number;
  totalItems: number;
  pageSize: number;
};

export function RegistroLogsPagination({
  basePath,
  params,
  page,
  totalItems,
  pageSize,
}: RegistroLogsPaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === "" || value === undefined) continue;
      q.set(key, value);
    }
    q.set("logPage", String(p));
    return `${basePath}?${q.toString()}`;
  };

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700"
      aria-label="Paginacion de registros"
    >
      <span>
        Mostrando <strong>{from}</strong>–<strong>{to}</strong> de <strong>{totalItems}</strong> (pagina{" "}
        <strong>{safePage}</strong> de <strong>{totalPages}</strong>)
      </span>
      <div className="flex flex-wrap gap-2">
        {safePage > 1 ? (
          <Link
            href={href(safePage - 1)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-lg border border-transparent px-3 py-1.5 text-slate-400">Anterior</span>
        )}
        {safePage < totalPages ? (
          <Link
            href={href(safePage + 1)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Siguiente
          </Link>
        ) : (
          <span className="rounded-lg border border-transparent px-3 py-1.5 text-slate-400">Siguiente</span>
        )}
      </div>
    </nav>
  );
}
