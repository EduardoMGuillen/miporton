import { Card } from "@/app/components/shell";
import { DatabaseBackupButton } from "@/app/super-admin/database-backup-button";
import { ReportsBackupButton } from "@/app/super-admin/reports-backup-button";
import { requireRole } from "@/lib/authorization";

export default async function SuperAdminBackupsPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Backup manual</h2>
      <p className="mb-4 text-sm text-slate-600">
        Descarga respaldos de reportes PDF y snapshot completo de datos para archivo interno.
      </p>
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="mb-2 font-semibold text-slate-900">Pasos — backup de base de datos con fotos (Vercel)</p>
        <ol className="list-decimal space-y-2 pl-5 text-slate-600">
          <li>
            Pulsa <strong className="text-slate-800">1/2 — Descargar datos (ZIP, sin fotos)</strong>. Guarda el
            archivo; trae todas las tablas en JSON y los metadatos de cada escaneo (tamaños y tipos de foto), pero
            no los bytes de las imágenes.
          </li>
          <li>
            En evidencia, elige <strong className="text-slate-800">escaneos por parte</strong> (30 si alguna parte
            falla por tiempo; puedes subir hasta 250 si el hosting lo aguanta y las fotos no son enormes).
          </li>
          <li>
            Pulsa <strong className="text-slate-800">Cargar partes</strong>. Verás cuántas partes hay según cuántos
            escaneos tienen foto.
          </li>
          <li>
            Descarga <strong className="text-slate-800">Parte 1</strong>, luego <strong className="text-slate-800">Parte 2</strong>, y así hasta la última. Cada ZIP solo contiene carpetas{" "}
            <code className="text-xs text-slate-800">evidence/</code> y un{" "}
            <code className="text-xs text-slate-800">evidence-part-manifest.json</code>.
          </li>
          <li>
            Para archivar o restaurar a mano: descomprime primero el ZIP de datos; después descomprime cada parte de
            evidencia <strong className="text-slate-800">en la misma raíz</strong> para que las carpetas{" "}
            <code className="text-xs text-slate-800">evidence/&lt;id&gt;/</code> queden junto a{" "}
            <code className="text-xs text-slate-800">data/</code> y <code className="text-xs text-slate-800">manifest.json</code>.
          </li>
          <li>
            Alternativa sin partes: en tu PC, con la URL de la base de datos en{" "}
            <code className="text-xs text-slate-800">DATABASE_URL</code>, ejecuta{" "}
            <code className="text-xs text-slate-800">npm run backup:db</code> (un solo ZIP con todo).
          </li>
        </ol>
      </div>
      <div className="grid gap-4">
        <ReportsBackupButton />
        <DatabaseBackupButton />
      </div>
    </Card>
  );
}
