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

  await notifyUser(session.userId, {
    title: "MiVisita",
    body: "Notificaciones activadas. Si ves esto, el push funciona en este dispositivo.",
    url,
    type: "test",
  });

  return NextResponse.json({ ok: true });
}
