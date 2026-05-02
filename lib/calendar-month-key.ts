/**
 * Mes calendario YYYY-MM segun zona horaria local del servidor (misma idea que filtros en Registros).
 */
export function calendarMonthKeyFromDate(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}
