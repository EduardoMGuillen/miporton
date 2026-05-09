import { Card } from "@/app/components/shell";
import { SiteBannerForm } from "@/app/super-admin/site-banner-form";
import { SITE_BANNER_ID } from "@/lib/site-banner";
import { prisma } from "@/lib/prisma";

export default async function SuperAdminBannerPage() {
  const row = await prisma.siteBanner.findUnique({
    where: { id: SITE_BANNER_ID },
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Banner de mensaje global</h2>
      <p className="mt-2 text-sm text-slate-600">
        Activa un aviso para todos los usuarios (residentes, guardias, administradores y visitantes en login). Puedes
        elegir el estilo del banner (informativo, positivo, aviso, urgente o neutro) para que el mensaje no parezca siempre
        un error.
      </p>
      <div className="mt-4">
        <SiteBannerForm
          enabled={row?.enabled ?? false}
          message={row?.message ?? ""}
          variant={row?.variant ?? "INFO"}
        />
      </div>
    </Card>
  );
}
