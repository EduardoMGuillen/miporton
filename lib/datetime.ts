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
