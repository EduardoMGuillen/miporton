import { Card } from "@/app/components/shell";
import { StatsPlatformFilter } from "@/app/super-admin/estadisticas/platform-filter";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { dragonConnectionHint } from "@/lib/postgres-serverless-url";
import { isDragonStatsConfigured, prismaDragon } from "@/lib/prisma-dragon";
import {
  fetchPlatformStats,
  mergeSuperAdminStats,
  parseStatsPlatformFilter,
  percent,
} from "@/lib/super-admin-stats";

export default async function SuperAdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["SUPER_ADMIN"]);

  const params = await searchParams;
  const platformRaw = Array.isArray(params.platform) ? params.platform[0] : params.platform;
  const filter = parseStatsPlatformFilter(platformRaw);
  const dragonConfigured = isDragonStatsConfigured();

  const [mivisita, dragon] = await Promise.all([
    fetchPlatformStats(prisma, "mivisita", "MiVisita"),
    dragonConfigured && prismaDragon
      ? fetchPlatformStats(prismaDragon, "dragon", "Dragon")
      : Promise.resolve(null),
  ]);

  const stats = mergeSuperAdminStats({
    filter,
    dragonConfigured,
    mivisita,
    dragon,
  });

  const showPlatformSplit = stats.filter === "all" && dragonConfigured && dragon?.available;
  const dragonConnectionHelp = stats.dragonError
    ? dragonConnectionHint(stats.dragonError)
    : null;

  const dragonProbe = dragon?.probe;
  const dragonLooksEmpty =
    dragon?.available &&
    dragon.totalUsers === 0 &&
    dragon.residentials.length === 0 &&
    dragon.entriesMonth === 0;

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Estadisticas globales (mes actual)</h2>
            <p className="mt-2 text-sm text-slate-600">
              Resumen operativo unificado. Las residenciales se muestran con etiqueta de plataforma.
            </p>
          </div>
          <StatsPlatformFilter current={stats.filter} dragonConfigured={dragonConfigured} />
        </div>

        {stats.dragonError ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>No se pudo cargar Dragon. Se muestran solo datos de MiVisita.</p>
            {dragonConnectionHelp ? (
              <p className="mt-2 font-medium">{dragonConnectionHelp}</p>
            ) : null}
            <p className="mt-2 text-xs opacity-90">{stats.dragonError}</p>
          </div>
        ) : null}

        {!dragonConfigured ? (
          <p className="mt-3 text-xs text-slate-500">
            Dragon no configurado. Agrega <code className="text-slate-700">DATABASE_URL_DRAGON</code> en Vercel para
            ver ambas plataformas.
          </p>
        ) : null}

        {dragonLooksEmpty ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Dragon conecta pero los conteos salen en 0.</p>
            {dragonProbe ? (
              <p className="mt-1 text-xs">
                Diagnostico en BD (usuario read-only): {dragonProbe.residentials} residenciales, {dragonProbe.users}{" "}
                usuarios, {dragonProbe.scans} escaneos totales.
              </p>
            ) : null}
            <p className="mt-2 text-xs">
              Si en Control Dragon si hay datos, el rol <code className="text-[11px]">mivisita_readonly</code> no ve
              filas (permisos o RLS). En Supabase del proyecto Dragon → SQL Editor, ejecuta como postgres:
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-amber-100/80 p-2 text-[10px] leading-relaxed text-amber-950">
{`GRANT USAGE ON SCHEMA public TO mivisita_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mivisita_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO mivisita_readonly;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE %I TO mivisita_readonly', r.name);
    IF (SELECT relrowsecurity FROM pg_class c2
        JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
        WHERE n2.nspname = 'public' AND c2.relname = r.name) THEN
      EXECUTE format('DROP POLICY IF EXISTS mivisita_readonly_select ON %I', r.name);
      EXECUTE format(
        'CREATE POLICY mivisita_readonly_select ON %I FOR SELECT TO mivisita_readonly USING (true)',
        r.name
      );
    END IF;
  END LOOP;
END $$;`}
            </pre>
            <p className="mt-2 text-xs">
              Comprueba en SQL: <code className="text-[11px]">SELECT COUNT(*) FROM &quot;User&quot;;</code> (como
              postgres). Si ves filas y el diagnostico sigue en 0, revisa que la URL apunte al mismo proyecto Supabase que
              mivisita-dragon.
            </p>
          </div>
        ) : null}

        {showPlatformSplit ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuarios totales</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.totalUsers}</p>
              <p className="mt-1 text-xs text-slate-600">
                MiVisita: {mivisita.totalUsers} | Dragon: {dragon?.totalUsers ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entradas (mes)</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.entriesMonth}</p>
              <p className="mt-1 text-xs text-slate-600">
                MiVisita: {mivisita.entriesMonth} | Dragon: {dragon?.entriesMonth ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salidas (mes)</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.exitsMonth}</p>
              <p className="mt-1 text-xs text-slate-600">
                MiVisita: {mivisita.exitsMonth} | Dragon: {dragon?.exitsMonth ?? 0}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Residenciales</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.residentials}</p>
            <p className="mt-1 text-xs text-slate-600">
              Activas: {stats.totals.activeResidentials} | Suspendidas: {stats.totals.suspendedResidentials}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuarios</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.totalUsers}</p>
            <p className="mt-1 text-xs text-slate-600">Cuentas en la plataforma</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entradas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.entriesMonth}</p>
            <p className="mt-1 text-xs text-slate-600">Con evidencia ID: {stats.idEvidenceRate}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salidas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.exitsMonth}</p>
            <p className="mt-1 text-xs text-slate-600">Registros con salida en el mes</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deliveries</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.deliveriesMonth}</p>
            <p className="mt-1 text-xs text-slate-600">Actividad de entregas del mes actual</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">QRs creados</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totals.qrCreatedMonth}</p>
            <p className="mt-1 text-xs text-slate-600">Tasa de uso: {stats.usageRate}%</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Usuarios activos 7d</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{stats.totals.totalActiveUsers7d}</p>
          <p className="mt-1 text-xs text-slate-600">Cuentas con login en ultimos 7 dias (con residencial)</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Usuarios activos por residencial (ultimos 7 dias)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Conteo de cuentas unicas que iniciaron sesion al menos una vez en la ultima semana.
        </p>
        <div className="mt-4 space-y-3">
          {stats.activeUsers7dByResidential.map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.residentialName}</p>
                <p className="text-xs text-slate-600">Activos 7d: {item.activeUsers7d}</p>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-indigo-600"
                  style={{ width: `${percent(item.activeUsers7d, stats.maxActiveUsers7d)}%` }}
                />
              </div>
            </div>
          ))}
          {stats.activeUsers7dByResidential.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no hay usuarios con inicio de sesion en los ultimos 7 dias.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Consumo total por residencial (mes actual)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Ranking por volumen de actividad combinada (entradas + delivery).
        </p>
        <div className="mt-4 space-y-3">
          {stats.topConsumption.map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.residentialName}</p>
                <p className="text-xs text-slate-600">
                  Total: {item.total} | QRs: {item.qrCreated} | Salidas: {item.exits}
                </p>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${percent(item.total, stats.maxTotalConsumption)}%` }}
                />
              </div>
              <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                <div>
                  Entradas: {item.entries}
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-1.5 rounded-full bg-emerald-600"
                      style={{ width: `${percent(item.entries, stats.maxEntries)}%` }}
                    />
                  </div>
                </div>
                <div>
                  Deliveries: {item.deliveries}
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-1.5 rounded-full bg-amber-500"
                      style={{ width: `${percent(item.deliveries, stats.maxDeliveries)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {stats.topConsumption.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no hay consumo registrado en este mes.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Tendencia de 6 meses</h2>
        <p className="mt-2 text-sm text-slate-600">
          Evolucion de entradas, salidas, deliveries y QRs creados.
        </p>
        <div className="mt-4 space-y-3">
          {stats.trend.map((item) => (
            <div key={item.monthKey} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <div className="mt-2 space-y-2 text-xs text-slate-600">
                <div>
                  Entradas: {item.entries}
                  <div className="mt-1 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-emerald-600"
                      style={{ width: `${percent(item.entries, stats.maxTrendValue)}%` }}
                    />
                  </div>
                </div>
                <div>
                  Salidas: {item.exits}
                  <div className="mt-1 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-violet-600"
                      style={{ width: `${percent(item.exits, stats.maxTrendValue)}%` }}
                    />
                  </div>
                </div>
                <div>
                  Deliveries: {item.deliveries}
                  <div className="mt-1 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-amber-500"
                      style={{ width: `${percent(item.deliveries, stats.maxTrendValue)}%` }}
                    />
                  </div>
                </div>
                <div>
                  QRs creados: {item.qrCreated}
                  <div className="mt-1 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${percent(item.qrCreated, stats.maxTrendValue)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
