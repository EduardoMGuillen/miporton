import Link from "next/link";
import { Card } from "@/app/components/shell";
import { formatTimeTegucigalpa } from "@/lib/datetime";
import {
  addDaysToKey,
  dayKeyTegucigalpa,
  formatDayLong,
  formatDayMonth,
  formatDayShort,
  formatHourLabel,
  isWeekendKey,
  PATROL_MAX_RANGE_DAYS,
  type PatrolStats,
} from "@/lib/patrol-stats";

const BASE_PATH = "/residential-admin/patrullaje";

const HEAT_CLASSES = [
  "bg-slate-100 text-slate-300",
  "bg-blue-100 text-blue-800",
  "bg-blue-300 text-blue-950",
  "bg-blue-500 text-white",
  "bg-blue-700 text-white",
] as const;

type Option = { id: string; name: string; note?: string };

export type PatrolDashboardProps = {
  stats: PatrolStats;
  from: string;
  to: string;
  today: string;
  zoneId: string;
  guardId: string;
  zoneOptions: Option[];
  guardOptions: Option[];
  heatmapZones: Option[];
  activeZoneIds: string[];
  previousTotal: number;
  truncated: boolean;
};

function buildHref(params: { from: string; to: string; zoneId?: string; guardId?: string }) {
  const search = new URLSearchParams();
  search.set("desde", params.from);
  search.set("hasta", params.to);
  if (params.zoneId) search.set("zona", params.zoneId);
  if (params.guardId) search.set("guardia", params.guardId);
  return `${BASE_PATH}?${search.toString()}`;
}

function heatLevel(count: number, max: number) {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}

function pluralChecks(count: number) {
  return `${count} ${count === 1 ? "marcaje" : "marcajes"}`;
}

export function PatrolDashboard(props: PatrolDashboardProps) {
  const { stats, from, to, today, zoneId, guardId } = props;
  const filterKeep = { zoneId, guardId };

  const elapsedDays = stats.dayKeys.filter((key) => key <= today);
  const elapsedCount = Math.max(1, elapsedDays.length);
  const average = stats.total / elapsedCount;
  const daysWithoutPatrol = elapsedDays.filter((key) => (stats.byDay.get(key) ?? 0) === 0);

  const relevantActiveZoneIds = zoneId
    ? props.activeZoneIds.filter((id) => id === zoneId)
    : props.activeZoneIds;
  const coveredActiveZones = relevantActiveZoneIds.filter((id) => stats.byZone.has(id)).length;
  const uncoveredZones = props.heatmapZones.filter(
    (zone) => relevantActiveZoneIds.includes(zone.id) && !stats.byZone.has(zone.id),
  );

  const delta = stats.total - props.previousTotal;
  const deltaPct = props.previousTotal > 0 ? Math.round((delta / props.previousTotal) * 100) : null;

  const maxDay = Math.max(0, ...stats.dayKeys.map((key) => stats.byDay.get(key) ?? 0));
  const maxHour = Math.max(0, ...stats.byHour);
  let maxCell = 0;
  for (const zoneDays of stats.matrix.values()) {
    for (const value of zoneDays.values()) maxCell = Math.max(maxCell, value);
  }

  const dayCount = stats.dayKeys.length;
  const showAllDayLabels = dayCount <= 14;
  const labelStep = showAllDayLabels ? 1 : Math.ceil(dayCount / 10);

  const guardsSorted = [...stats.byGuard.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxGuard = guardsSorted[0]?.[1].count ?? 0;

  const zonesSorted = [...stats.byZone.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxZone = zonesSorted[0]?.[1].count ?? 0;

  const peakHour = maxHour > 0 ? stats.byHour.indexOf(maxHour) : -1;
  const nightChecks = stats.byHour.reduce((sum, value, hour) => (hour >= 18 || hour < 6 ? sum + value : sum), 0);

  const detailDays = [...stats.dayKeys].reverse().filter((key) => (stats.checksByDay.get(key)?.length ?? 0) > 0);

  const monthStart = `${today.slice(0, 7)}-01`;
  const quickRanges = [
    { label: "Hoy", from: today, to: today },
    { label: "Ayer", from: addDaysToKey(today, -1), to: addDaysToKey(today, -1) },
    { label: "7 días", from: addDaysToKey(today, -6), to: today },
    { label: "30 días", from: addDaysToKey(today, -29), to: today },
    { label: "Este mes", from: monthStart, to: today },
  ];

  const hasFilters = Boolean(zoneId || guardId);
  const selectedZoneName = props.zoneOptions.find((z) => z.id === zoneId)?.name;
  const selectedGuardName = props.guardOptions.find((g) => g.id === guardId)?.name;

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Patrullajes realizados</h2>
            <p className="mt-0.5 text-sm text-slate-600 first-letter:uppercase">
              {from === to ? formatDayLong(from) : `${formatDayMonth(from)} – ${formatDayMonth(to)}`}
              {selectedZoneName ? ` · Zona: ${selectedZoneName}` : ""}
              {selectedGuardName ? ` · Guardia: ${selectedGuardName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickRanges.map((range) => {
              const active = range.from === from && range.to === to;
              return (
                <Link
                  key={range.label}
                  href={buildHref({ from: range.from, to: range.to, ...filterKeep })}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {range.label}
                </Link>
              );
            })}
          </div>
        </div>

        <form
          method="get"
          action={BASE_PATH}
          className="mt-4 grid w-full min-w-0 grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto]"
        >
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Desde</label>
            <input type="date" name="desde" defaultValue={from} max={today} className="field-base text-sm" />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta</label>
            <input type="date" name="hasta" defaultValue={to} max={today} className="field-base text-sm" />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Zona</label>
            <select name="zona" defaultValue={zoneId} className="field-base min-w-0 w-full">
              <option value="">Todas las zonas</option>
              {props.zoneOptions.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                  {zone.note ? ` (${zone.note})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Guardia</label>
            <select name="guardia" defaultValue={guardId} className="field-base min-w-0 w-full">
              <option value="">Todos los guardias</option>
              {props.guardOptions.map((guard) => (
                <option key={guard.id} value={guard.id}>
                  {guard.name}
                  {guard.note ? ` (${guard.note})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
            <button type="submit" className="btn-primary flex-1 lg:flex-none">
              Aplicar
            </button>
            {hasFilters ? (
              <Link
                href={buildHref({ from, to })}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>
        <p className="mt-2 text-[11px] text-slate-500">
          Rango máximo: {PATROL_MAX_RANGE_DAYS} días. Horario de Tegucigalpa.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Marcajes"
          value={stats.total.toLocaleString("es-HN")}
          hint={
            deltaPct === null
              ? props.previousTotal === 0 && stats.total > 0
                ? "Sin datos del periodo anterior"
                : "Igual que el periodo anterior"
              : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(deltaPct)}% vs periodo anterior`
          }
          tone={deltaPct === null ? "neutral" : delta >= 0 ? "good" : "bad"}
        />
        <KpiCard
          label="Promedio diario"
          value={average.toLocaleString("es-HN", { maximumFractionDigits: 1 })}
          hint={peakHour >= 0 ? `Hora pico: ${formatHourLabel(peakHour)}` : "Sin actividad"}
          tone="neutral"
        />
        <KpiCard
          label="Días con patrullaje"
          value={`${stats.daysWithActivity}/${elapsedDays.length}`}
          hint={
            daysWithoutPatrol.length > 0
              ? `${daysWithoutPatrol.length} ${daysWithoutPatrol.length === 1 ? "día" : "días"} sin marcajes`
              : "Todos los días cubiertos"
          }
          tone={daysWithoutPatrol.length > 0 ? "bad" : "good"}
        />
        <KpiCard
          label="Zonas cubiertas"
          value={`${coveredActiveZones}/${relevantActiveZoneIds.length}`}
          hint={
            uncoveredZones.length > 0
              ? `${uncoveredZones.length} ${uncoveredZones.length === 1 ? "zona" : "zonas"} sin visitar`
              : relevantActiveZoneIds.length > 0
                ? "Todas visitadas"
                : "Sin zonas activas"
          }
          tone={uncoveredZones.length > 0 ? "bad" : "good"}
        />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Marcajes por día</h3>
            <p className="text-xs text-slate-500">Toca una barra para ver el detalle de ese día.</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> Marcajes
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Sin patrullaje
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div
            className="flex h-48 items-stretch gap-1 border-b border-slate-200 pb-0"
            style={{ minWidth: `${Math.max(dayCount * (showAllDayLabels ? 40 : 14), 280)}px` }}
          >
            {stats.dayKeys.map((key) => {
              const count = stats.byDay.get(key) ?? 0;
              const future = key > today;
              const heightPct = maxDay > 0 ? (count / maxDay) * 82 : 0;
              const isSelected = from === to && from === key;
              return (
                <Link
                  key={key}
                  href={buildHref({ from: key, to: key, ...filterKeep })}
                  title={`${formatDayLong(key)}: ${pluralChecks(count)}`}
                  className={`group relative flex min-w-0 flex-1 flex-col items-center justify-end rounded-t-md ${
                    isWeekendKey(key) ? "bg-slate-50" : ""
                  } ${isSelected ? "ring-2 ring-blue-300" : ""}`}
                >
                  {showAllDayLabels && count > 0 ? (
                    <span className="mb-1 text-[11px] font-semibold text-slate-700">{count}</span>
                  ) : null}
                  {count > 0 ? (
                    <span
                      className="w-full max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-blue-700 to-blue-500 transition group-hover:from-blue-800 group-hover:to-blue-600"
                      style={{ height: `${Math.max(heightPct, 3)}%` }}
                    />
                  ) : (
                    <span
                      className={`h-1.5 w-full max-w-[2.5rem] rounded-t-sm ${future ? "bg-slate-200" : "bg-rose-400"}`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
          <div
            className="mt-1 flex gap-1"
            style={{ minWidth: `${Math.max(dayCount * (showAllDayLabels ? 40 : 14), 280)}px` }}
          >
            {stats.dayKeys.map((key, index) => (
              <span
                key={key}
                className={`min-w-0 flex-1 text-center text-[10px] leading-tight ${
                  key === today ? "font-bold text-blue-700" : "text-slate-500"
                }`}
              >
                {index % labelStep === 0 || index === dayCount - 1
                  ? showAllDayLabels
                    ? formatDayShort(key)
                    : formatDayMonth(key)
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Cobertura por zona y día</h3>
            <p className="text-xs text-slate-500">Cada celda muestra cuántas veces se marcó la zona ese día.</p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Menos</span>
            {HEAT_CLASSES.map((cls, index) => (
              <span key={index} className={`h-3 w-3 rounded-sm ${cls.split(" ")[0]}`} />
            ))}
            <span>Más</span>
          </div>
        </div>
        {props.heatmapZones.length === 0 ? (
          <p className="text-sm text-slate-600">No hay zonas para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white pr-2 text-left font-semibold text-slate-500">Zona</th>
                  {stats.dayKeys.map((key, index) => (
                    <th
                      key={key}
                      className={`min-w-[1.75rem] text-center text-[10px] font-medium ${
                        key === today ? "text-blue-700" : "text-slate-400"
                      }`}
                    >
                      {showAllDayLabels || index % labelStep === 0 ? formatDayShort(key) : ""}
                    </th>
                  ))}
                  <th className="pl-2 text-right font-semibold text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {props.heatmapZones.map((zone) => {
                  const zoneDays = stats.matrix.get(zone.id);
                  const total = stats.byZone.get(zone.id)?.count ?? 0;
                  return (
                    <tr key={zone.id}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 max-w-[10rem] truncate bg-white pr-2 text-left font-medium text-slate-800"
                        title={zone.name}
                      >
                        {zone.name}
                        {zone.note ? <span className="ml-1 text-[10px] text-slate-400">({zone.note})</span> : null}
                      </th>
                      {stats.dayKeys.map((key) => {
                        const count = zoneDays?.get(key) ?? 0;
                        const future = key > today;
                        return (
                          <td
                            key={key}
                            title={`${zone.name} · ${formatDayLong(key)}: ${pluralChecks(count)}`}
                            className={`h-7 min-w-[1.75rem] rounded-md text-center align-middle text-[11px] font-semibold ${
                              future ? "bg-white text-transparent" : HEAT_CLASSES[heatLevel(count, maxCell)]
                            }`}
                          >
                            {count > 0 ? count : ""}
                          </td>
                        );
                      })}
                      <td
                        className={`pl-2 text-right font-semibold ${total === 0 ? "text-rose-600" : "text-slate-800"}`}
                      >
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {uncoveredZones.length > 0 ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <span className="font-semibold">Zonas sin marcaje en el periodo:</span>{" "}
            {uncoveredZones.map((zone) => zone.name).join(", ")}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-slate-900">Por hora del día</h3>
          <p className="mb-3 text-xs text-slate-500">
            {stats.total > 0
              ? `${Math.round((nightChecks / stats.total) * 100)}% de los marcajes fueron de noche (6p – 6a).`
              : "Sin marcajes en el periodo."}
          </p>
          <div className="flex h-32 items-end gap-[3px] border-b border-slate-200">
            {stats.byHour.map((count, hour) => {
              const night = hour >= 18 || hour < 6;
              const heightPct = maxHour > 0 ? (count / maxHour) * 100 : 0;
              return (
                <div
                  key={hour}
                  title={`${formatHourLabel(hour)}: ${pluralChecks(count)}`}
                  className="flex h-full min-w-0 flex-1 items-end"
                >
                  <span
                    className={`w-full rounded-t-sm ${
                      count === 0 ? "bg-slate-100" : night ? "bg-indigo-500" : "bg-sky-400"
                    }`}
                    style={{ height: count === 0 ? "4px" : `${Math.max(heightPct, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-[3px]">
            {stats.byHour.map((_, hour) => (
              <span key={hour} className="min-w-0 flex-1 text-center text-[9px] text-slate-400">
                {hour % 3 === 0 ? formatHourLabel(hour) : ""}
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Día
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Noche
            </span>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Por guardia</h3>
          {guardsSorted.length === 0 ? (
            <p className="text-sm text-slate-600">Sin marcajes en el periodo.</p>
          ) : (
            <ul className="space-y-2.5">
              {guardsSorted.map(([id, guard]) => (
                <li key={id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={buildHref({ from, to, zoneId, guardId: id })}
                      className="truncate font-medium text-slate-800 hover:text-blue-700 hover:underline"
                    >
                      {guard.name}
                    </Link>
                    <span className="shrink-0 text-xs font-semibold text-slate-600">
                      {guard.count} · {Math.round((guard.count / stats.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${maxGuard > 0 ? (guard.count / maxGuard) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {zonesSorted.length > 0 ? (
            <>
              <h3 className="mb-3 mt-6 text-base font-semibold text-slate-900">Por zona</h3>
              <ul className="space-y-2.5">
                {zonesSorted.map(([id, zone]) => (
                  <li key={id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <Link
                        href={buildHref({ from, to, zoneId: id, guardId })}
                        className="truncate font-medium text-slate-800 hover:text-blue-700 hover:underline"
                      >
                        {zone.name}
                      </Link>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{zone.count}</span> · último{" "}
                        {dayKeyTegucigalpa(zone.lastAt) === today
                          ? formatTimeTegucigalpa(zone.lastAt)
                          : formatDayMonth(dayKeyTegucigalpa(zone.lastAt))}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                        style={{ width: `${maxZone > 0 ? (zone.count / maxZone) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-slate-900">Detalle por día</h3>
        <p className="mb-3 text-xs text-slate-500">
          {detailDays.length > 0
            ? `${detailDays.length} ${detailDays.length === 1 ? "día" : "días"} con marcajes. Abre un día para ver cada marcaje.`
            : "Todavía no hay marcajes de patrullaje en este periodo."}
        </p>
        {props.truncated ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            El periodo tiene demasiados marcajes; se muestran los más recientes. Reduce el rango para ver todo.
          </p>
        ) : null}
        <div className="space-y-2">
          {detailDays.map((key, index) => {
            const checks = stats.checksByDay.get(key) ?? [];
            const guardsCount = new Set(checks.map((check) => check.guardId)).size;
            const zonesCount = new Set(checks.map((check) => check.zoneId)).size;
            return (
              <details
                key={key}
                open={index === 0}
                className="group rounded-xl border border-slate-200 bg-slate-50/60 open:bg-white"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-slate-400 transition group-open:rotate-90">▸</span>
                    <span className="truncate text-sm font-semibold text-slate-900 first-letter:uppercase">
                      {formatDayLong(key)}
                    </span>
                    {key === today ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Hoy
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white">
                      {pluralChecks(checks.length)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {zonesCount} {zonesCount === 1 ? "zona" : "zonas"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {guardsCount} {guardsCount === 1 ? "guardia" : "guardias"}
                    </span>
                  </div>
                </summary>
                <ul className="divide-y divide-slate-100 border-t border-slate-100 px-3 sm:px-4">
                  {checks.map((check) => (
                    <li key={check.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 py-2 text-sm sm:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)]">
                      <span className="font-mono text-xs leading-5 text-slate-500">
                        {formatTimeTegucigalpa(check.checkedAt)}
                      </span>
                      <span className="truncate font-medium text-slate-900">{check.zoneName}</span>
                      <span className="col-start-2 truncate text-xs text-slate-600 sm:col-start-auto sm:text-sm">
                        {check.guardName}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "good" | "bad" | "neutral";
}) {
  const hintClass =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-600" : "text-slate-500";
  return (
    <div className="surface-card min-w-0 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`mt-0.5 truncate text-[11px] font-medium ${hintClass}`}>{hint}</p>
    </div>
  );
}
