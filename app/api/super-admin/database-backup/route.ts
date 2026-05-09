import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildDatabaseBackupZip } from "@/lib/database-backup-zip";

/** Allow long runs on Vercel Pro+; Hobby stays capped by plan (~10s) — backup con imagenes suele fallar ahi; usar `npm run backup:db` en local. */
export const maxDuration = 120;
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skipEvidence =
    searchParams.get("skipEvidence") === "1" ||
    searchParams.get("skipEvidence") === "true";

  try {
    const { buffer, fileName } = await buildDatabaseBackupZip({
      skipEvidence,
      author: { fullName: session.fullName, userId: session.userId },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[database-backup]", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error:
          "No se pudo generar el backup de base de datos. Reintenta en unos minutos. Si persiste, puede ser por volumen de datos o limite de tiempo del plan de hosting; prueba el backup sin evidencia, npm run backup:db en tu PC con DATABASE_URL de produccion, o el backup PDF.",
        detail,
      },
      { status: 500 },
    );
  }
}
