const TEGUCIGALPA_TIME_ZONE = "America/Tegucigalpa";

export function formatDateTimeTegucigalpa(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: TEGUCIGALPA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Fecha larga para capturas (ej. sábado, 9 de mayo de 2026). */
export function formatLongDateTegucigalpa(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: TEGUCIGALPA_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Solo hora en zona Tegucigalpa. */
export function formatTimeTegucigalpa(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: TEGUCIGALPA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

