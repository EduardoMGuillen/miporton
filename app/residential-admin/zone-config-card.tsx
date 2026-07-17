import { updateZoneScheduleAction } from "@/app/residential-admin/actions";
import { ZoneWeekdayFields } from "@/app/residential-admin/zone-weekday-fields";
import { formatAllowedDaysLabel } from "@/lib/zone-weekdays";

type ZoneRow = {
  id: string;
  name: string;
  description: string | null;
  maxHoursPerReservation: number;
  oneReservationPerDay: boolean;
  reservationWeekdaysMask: number;
  scheduleStartHour: number;
  scheduleEndHour: number;
  isActive: boolean;
};

export function ZoneConfigCard({ zone }: { zone: ZoneRow }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{zone.name}</h3>
          {zone.description ? <p className="mt-1 text-xs text-slate-500">{zone.description}</p> : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            zone.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {zone.isActive ? "Activa" : "Inactiva"}
        </span>
      </div>

      <dl className="mt-3 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Maximo por reserva</dt>
          <dd>{zone.maxHoursPerReservation} hora(s)</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Horario</dt>
          <dd>
            {String(zone.scheduleStartHour).padStart(2, "0")}:00 -{" "}
            {String(zone.scheduleEndHour).padStart(2, "0")}:00
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Limite diario</dt>
          <dd>{zone.oneReservationPerDay ? "1 reserva por dia" : "Multiples por dia"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Dias habilitados</dt>
          <dd>{formatAllowedDaysLabel(zone.reservationWeekdaysMask)}</dd>
        </div>
      </dl>

      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-blue-700">
          Editar horario y dias
        </summary>
        <form action={updateZoneScheduleAction} className="space-y-3 border-t border-slate-200 p-3">
          <input type="hidden" name="zoneId" value={zone.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Hora inicio
              </label>
              <input
                name="scheduleStartHour"
                type="number"
                min={0}
                max={23}
                defaultValue={zone.scheduleStartHour}
                className="field-base w-full"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Hora fin
              </label>
              <input
                name="scheduleEndHour"
                type="number"
                min={1}
                max={24}
                defaultValue={zone.scheduleEndHour}
                className="field-base w-full"
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <input
              type="checkbox"
              name="oneReservationPerDay"
              defaultChecked={zone.oneReservationPerDay}
              className="h-4 w-4 accent-blue-600"
            />
            Activar 1 reserva por dia
          </label>
          <ZoneWeekdayFields defaultMask={zone.reservationWeekdaysMask} />
          <button
            type="submit"
            className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 sm:w-auto"
          >
            Guardar cambios
          </button>
        </form>
      </details>
    </article>
  );
}
