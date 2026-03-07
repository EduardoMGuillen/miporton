import QRCode from "qrcode";
import { Card } from "@/app/components/shell";
import { CreateAdminQrForm } from "@/app/residential-admin/create-admin-qr-form";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { QrShareActions } from "@/app/resident/qr-share-actions";

function validityLabel(validityType: "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS" | "INFINITE") {
  if (validityType === "SINGLE_USE") return "1 solo uso";
  if (validityType === "ONE_DAY") return "Valido por 1 dia";
  if (validityType === "INFINITE") return "Sin vencimiento";
  return "Valido por 3 dias";
}

export default async function ResidentialAdminQrPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const residents = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: "RESIDENT",
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  const [residential, qrCodes] = await Promise.all([
    prisma.residential.findUnique({
      where: { id: session.residentialId },
      select: { name: true },
    }),
    prisma.qrCode.findMany({
      where: {
        residentialId: session.residentialId,
        residentId: session.userId,
      },
      include: {
        resident: {
          select: { fullName: true, role: true },
        },
      },
      orderBy: [{ validUntil: "asc" }, { createdAt: "desc" }],
      take: 80,
    }),
  ]);
  const qrCodesWithImage = await Promise.all(
    qrCodes.map(async (qr) => ({
      ...qr,
      image: await QRCode.toDataURL(`MP:${qr.code}`),
    })),
  );
  const now = new Date();
  const activeQrCodes = qrCodesWithImage.filter(
    (qr) => !qr.isRevoked && qr.validUntil >= now && qr.usedCount < qr.maxUses,
  );
  const expiredQrCodes = qrCodesWithImage.filter(
    (qr) => qr.isRevoked || qr.validUntil < now || qr.usedCount >= qr.maxUses,
  );

  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Generar QR como administracion</h2>
        <CreateAdminQrForm residents={residents} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">QR activos de administracion ({activeQrCodes.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {activeQrCodes.map((qr) => (
            <article key={qr.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">{qr.visitorName}</p>
              <p className="text-xs text-slate-600">{validityLabel(qr.validityType)}</p>
              {qr.description ? <p className="text-xs text-slate-500">Descripcion: {qr.description}</p> : null}
              <p className="text-xs text-slate-500">Vehiculo: {qr.hasVehicle ? "Si" : "No"}</p>
              <p className="text-xs text-slate-500">Expira: {formatDateTimeTegucigalpa(qr.validUntil)}</p>
              <p className="text-xs text-slate-500">
                Usos: {qr.usedCount}/{qr.maxUses === 9999 ? "Ilimitado" : qr.maxUses}
              </p>
              <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-[10px] text-slate-500">
                MP:{qr.code}
              </p>
              <QrShareActions
                qrDataUrl={qr.image}
                visitorName={qr.visitorName}
                code={qr.code}
                validityLabel={validityLabel(qr.validityType)}
                validUntilLabel={formatDateTimeTegucigalpa(qr.validUntil)}
                residentialName={residential?.name ?? "Residencial"}
                residentName={session.fullName}
              />
            </article>
          ))}
          {activeQrCodes.length === 0 ? (
            <p className="text-sm text-slate-600">No hay QRs activos de administracion.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
            QRs expirados de administracion ({expiredQrCodes.length})
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {expiredQrCodes.map((qr) => (
              <article key={qr.id} className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 opacity-90">
                <p className="text-sm font-semibold text-slate-900">{qr.visitorName}</p>
                <p className="text-xs text-slate-600">{validityLabel(qr.validityType)}</p>
                {qr.description ? <p className="text-xs text-slate-500">Descripcion: {qr.description}</p> : null}
                <p className="text-xs text-slate-500">Vehiculo: {qr.hasVehicle ? "Si" : "No"}</p>
                <p className="text-xs text-slate-500">Expira: {formatDateTimeTegucigalpa(qr.validUntil)}</p>
                <p className="text-xs text-slate-500">
                  Usos: {qr.usedCount}/{qr.maxUses === 9999 ? "Ilimitado" : qr.maxUses}
                </p>
                <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-[10px] text-slate-500">
                  MP:{qr.code}
                </p>
              </article>
            ))}
            {expiredQrCodes.length === 0 ? (
              <p className="text-sm text-slate-600">No hay QRs expirados de administracion.</p>
            ) : null}
          </div>
        </details>
      </Card>
    </>
  );
}
