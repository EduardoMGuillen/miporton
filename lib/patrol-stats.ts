/** Tegucigalpa no usa horario de verano: UTC-6 fijo (mismo criterio que la vista de guardia). */
const TEGUCIGALPA_OFFSET_HOURS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PATROL_MAX_RANGE_DAYS = 92;
export const PATROL_DEFAULT_RANGE_DAYS = 7;

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dayKeyTegucigalpa(value: Date) {
  const shifted = new Date(value.getTime() - TEGUCIGALPA_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function hourTegucigalpa(value: Date) {
  return (value.getUTCHours() - TEGUCIGALPA_OFFSET_HOURS + 24) % 24;
}

export function isValidDayKey(value: string) {
  const match = DAY_KEY_RE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

export function addDaysToKey(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

export function daysBetweenKeys(fromKey: string, toKey: string) {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty!, tm! - 1, td!) - Date.UTC(fy!, fm! - 1, fd!)) / DAY_MS);
}

export function listDayKeys(fromKey: string, toKey: string) {
  const total = daysBetweenKeys(fromKey, toKey);
  return Array.from({ length: total + 1 }, (_, index) => addDaysToKey(fromKey, index));
}

/** Inicio (inclusive) y fin (exclusivo) en UTC para un rango de días locales de Tegucigalpa. */
export function rangeBoundsUtc(fromKey: string, toKey: string) {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(fy!, fm! - 1, fd!, TEGUCIGALPA_OFFSET_HOURS)),
    end: new Date(Date.UTC(ty!, tm! - 1, td! + 1, TEGUCIGALPA_OFFSET_HOURS)),
  };
}

export function resolvePatrolRange(rawFrom: string, rawTo: string, now = new Date()) {
  const today = dayKeyTegucigalpa(now);
  let to = isValidDayKey(rawTo) ? rawTo : today;
  let from = isValidDayKey(rawFrom) ? rawFrom : addDaysToKey(to, -(PATROL_DEFAULT_RANGE_DAYS - 1));
  if (from > to) [from, to] = [to, from];
  if (daysBetweenKeys(from, to) >= PATROL_MAX_RANGE_DAYS) {
    from = addDaysToKey(to, -(PATROL_MAX_RANGE_DAYS - 1));
  }
  return { from, to, today };
}

function dayKeyToNoonUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12));
}

export function formatDayShort(key: string) {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
  }).format(dayKeyToNoonUtc(key));
}

export function formatDayMonth(key: string) {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(dayKeyToNoonUtc(key));
}

export function formatDayLong(key: string) {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dayKeyToNoonUtc(key));
}

export function isWeekendKey(key: string) {
  const weekday = dayKeyToNoonUtc(key).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function formatHourLabel(hour: number) {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

export type PatrolCheckRow = {
  id: string;
  checkedAt: Date;
  zoneId: string;
  guardId: string;
  zoneName: string;
  guardName: string;
};

export type PatrolStats = {
  total: number;
  dayKeys: string[];
  byDay: Map<string, number>;
  byHour: number[];
  byZone: Map<string, { name: string; count: number; lastAt: Date }>;
  byGuard: Map<string, { name: string; count: number }>;
  matrix: Map<string, Map<string, number>>;
  checksByDay: Map<string, PatrolCheckRow[]>;
  daysWithActivity: number;
};

export function buildPatrolStats(rows: PatrolCheckRow[], fromKey: string, toKey: string): PatrolStats {
  const dayKeys = listDayKeys(fromKey, toKey);
  const byDay = new Map<string, number>(dayKeys.map((key) => [key, 0]));
  const byHour = Array.from({ length: 24 }, () => 0);
  const byZone = new Map<string, { name: string; count: number; lastAt: Date }>();
  const byGuard = new Map<string, { name: string; count: number }>();
  const matrix = new Map<string, Map<string, number>>();
  const checksByDay = new Map<string, PatrolCheckRow[]>();

  for (const row of rows) {
    const day = dayKeyTegucigalpa(row.checkedAt);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const hour = hourTegucigalpa(row.checkedAt);
    byHour[hour] = (byHour[hour] ?? 0) + 1;

    const zone = byZone.get(row.zoneId);
    if (zone) {
      zone.count += 1;
      if (row.checkedAt > zone.lastAt) zone.lastAt = row.checkedAt;
    } else {
      byZone.set(row.zoneId, { name: row.zoneName, count: 1, lastAt: row.checkedAt });
    }

    const guard = byGuard.get(row.guardId);
    if (guard) guard.count += 1;
    else byGuard.set(row.guardId, { name: row.guardName, count: 1 });

    let zoneDays = matrix.get(row.zoneId);
    if (!zoneDays) {
      zoneDays = new Map();
      matrix.set(row.zoneId, zoneDays);
    }
    zoneDays.set(day, (zoneDays.get(day) ?? 0) + 1);

    const dayChecks = checksByDay.get(day);
    if (dayChecks) dayChecks.push(row);
    else checksByDay.set(day, [row]);
  }

  let daysWithActivity = 0;
  for (const key of dayKeys) {
    if ((byDay.get(key) ?? 0) > 0) daysWithActivity += 1;
  }

  return {
    total: rows.length,
    dayKeys,
    byDay,
    byHour,
    byZone,
    byGuard,
    matrix,
    checksByDay,
    daysWithActivity,
  };
}
