"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/residential-admin/usuarios", label: "Usuarios" },
  { href: "/residential-admin/zonas-reservas", label: "Zonas y reservas" },
  { href: "/residential-admin/comunicados", label: "Comunicados" },
  { href: "/residential-admin/sugerencias", label: "Sugerencias" },
  { href: "/residential-admin/qr-admin", label: "QR administracion" },
  { href: "/residential-admin/registros", label: "Registro y reportes" },
  { href: "/residential-admin/configuracion", label: "Configuracion" },
];

export function ResidentialAdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="lg:hidden">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Secciones
        </label>
        <select
          value={pathname}
          onChange={(event) => router.push(event.target.value)}
          className="field-base"
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <nav className="hidden lg:flex lg:flex-col lg:gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-slate-700 border border-transparent hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
