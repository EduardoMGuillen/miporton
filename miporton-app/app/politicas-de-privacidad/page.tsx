import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";

export default async function PrivacyPolicyPage() {
  const session = await getSession();
  const backHref = session ? dashboardPathByRole(session.role) : "/";

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <section className="surface-card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Politicas de Privacidad</h1>
        <p className="mt-2 text-sm text-slate-600">Ultima actualizacion: 23 de marzo de 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900">1. Responsable del tratamiento</h2>
            <p>
              MiVisita es operado por Nexus Global. Esta politica describe como recopilamos, usamos,
              almacenamos y protegemos datos personales y datos operativos de acceso residencial.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">2. Datos que se recopilan</h2>
            <p>
              Podemos tratar datos de usuarios administradores, residentes y guardias, incluyendo
              nombre, correo, rol, registros de acceso, historiales de reserva y datos de evidencia
              (por ejemplo, fotografia de identificacion y placa cuando aplique).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">3. Finalidad del uso de datos</h2>
            <p>
              Los datos se usan para habilitar el control de accesos, trazabilidad operativa, gestion
              de reservas, notificaciones, reportes de seguridad y continuidad del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">4. Base legal y autorizaciones</h2>
            <p>
              Cada residencial y sus administradores son responsables de contar con las autorizaciones
              y avisos necesarios frente a residentes, visitantes y terceros sobre el tratamiento de
              datos en su operacion interna.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">5. Conservacion y retencion</h2>
            <p>
              Conservamos datos operativos segun necesidades del servicio y obligaciones aplicables.
              Ciertos datos sensibles de evidencia pueden ser depurados por politicas de retencion
              configuradas en la plataforma sin afectar la trazabilidad del evento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">6. Seguridad de la informacion</h2>
            <p>
              Nexus Global aplica medidas tecnicas y organizativas razonables para proteger la
              informacion. No obstante, ningun sistema conectado a internet puede garantizar seguridad
              absoluta frente a incidentes, ataques o interrupciones.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">7. Comparticion de datos</h2>
            <p>
              Nexus Global no comercializa datos personales. La informacion puede ser compartida con
              proveedores de infraestructura y servicios tecnologicos estrictamente necesarios para la
              operacion de la plataforma, bajo controles razonables.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">8. Derechos y solicitudes</h2>
            <p>
              Las solicitudes de acceso, correccion o eliminacion de datos deben canalizarse por la
              administracion de la residencial y/o por los medios de soporte oficiales de Nexus Global.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">9. Limitacion de responsabilidad</h2>
            <p>
              Nexus Global actua como proveedor tecnologico. La gestion de usuarios, contenido, reglas
              de acceso y uso operativo diario es responsabilidad de cada residencial. Nexus Global no
              asume responsabilidad por decisiones internas de administracion, uso indebido de cuentas
              o incumplimientos normativos atribuibles al cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">10. Cambios en esta politica</h2>
            <p>
              Podemos actualizar esta politica cuando sea necesario. El uso continuo de la plataforma
              despues de cambios publicados implica aceptacion de la version vigente.
            </p>
          </section>
        </div>

        <div className="mt-8">
          <Link
            href={backHref}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Regresar al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
