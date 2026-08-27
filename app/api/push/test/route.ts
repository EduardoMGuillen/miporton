import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isPushConfigured, notifyUser } from "@/lib/push";

export async function POST() {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "RESIDENT" && session.role !== "GUARD" && session.role !== "RESIDENTIAL_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push no configurado en el servidor." }, { status: 503 });
  }

  const url =
    session.role === "GUARD"
      ? "/guard"
      : session.role === "RESIDENTIAL_ADMIN"
        ? "/residential-admin"
        : "/resident";

  const result = await notifyUser(session.userId, {
    title: "MiVisita — Prueba",
    body: "Si ves esto, las notificaciones push funcionan en este dispositivo.",
    url,
    type: "test",
  });

  if (result.total === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No hay dispositivos suscritos. Pulsa «Activar notificaciones» en este teléfono primero.",
        sent: 0,
        total: 0,
      },
      { status: 404 },
    );
  }

  if (result.sent === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          result.removed > 0
            ? "La suscripción estaba vencida y se eliminó. Pulsa «Activar notificaciones» de nuevo."
            : "No se pudo entregar el push (revisa VAPID en el servidor o vuelve a activar).",
        sent: 0,
        total: result.total,
        failed: result.failed,
        removed: result.removed,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    total: result.total,
    failed: result.failed,
    removed: result.removed,
    message: "Notificación de prueba enviada. Revisa la bandeja del sistema (también con la app minimizada).",
  });
}
