/** JS weekday: 0 = Sunday … 6 = Saturday */
export const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export const WEEKDAY_LABELS_ES: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mie",
  4: "Jue",
  5: "Vie",
  6: "Sab",
};

export const WEEKDAY_LABELS_EN: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const ALL_WEEKDAYS_MASK = 127;

export function isWeekdayAllowed(mask: number, weekday: number) {
  if (weekday < 0 || weekday > 6) return false;
  return ((mask >> weekday) & 1) === 1;
}

/** Weekday (0–6) for a calendar date YYYY-MM-DD in America/Tegucigalpa */
export function tegucigalpaWeekdayFromDatePart(datePart: string) {
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 18, 0, 0, 0));
  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Tegucigalpa",
    weekday: "short",
  }).format(utcNoon);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekdayLabel] ?? null;
}

export function maskFromCheckedDays(checked: Record<number, boolean>) {
  let mask = 0;
  for (const day of WEEKDAY_ORDER) {
    if (checked[day]) mask |= 1 << day;
  }
  return mask;
}

export function maskFromFormEntries(formData: FormData, prefix = "reservationDay") {
  const checked: Record<number, boolean> = {};
  for (const day of WEEKDAY_ORDER) {
    checked[day] = formData.get(`${prefix}_${day}`) === "on";
  }
  return maskFromCheckedDays(checked);
}

export function allowedDaysFromMask(mask: number) {
  return WEEKDAY_ORDER.filter((day) => isWeekdayAllowed(mask, day));
}

export function formatAllowedDaysLabel(mask: number, locale: "es" | "en" = "es") {
  const labels = locale === "en" ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_ES;
  const days = allowedDaysFromMask(mask);
  if (days.length === 0) return locale === "en" ? "No days" : "Ningun dia";
  if (days.length === 7) return locale === "en" ? "Every day" : "Todos los dias";
  return days.map((d) => labels[d]).join(", ");
}
