import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";

export default async function TermsPage() {
  const session = await getSession();
  const backHref = session ? dashboardPathByRole(session.role) : "/";

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <section className="surface-card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Terminos de Uso</h1>
        <p className="mt-2 text-sm text-slate-600">Ultima actualizacion: 23 de marzo de 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900">1. Objeto del servicio</h2>
            <p>
              MiVisita es una plataforma de soporte para gestion de acceso residencial, reservas y
              reportes operativos. Nexus Global provee la tecnologia y servicios asociados.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">2. Aceptacion de terminos</h2>
            <p>
              Al utilizar la plataforma, la residencial y sus usuarios aceptan estos terminos y se
              comprometen a usar el sistema conforme a ley, buena fe y politicas internas de seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">3. Cuentas y credenciales</h2>
            <p>
              Cada cliente es responsable de la custodia de credenciales, administracion de cuentas y
              permisos. Toda actividad realizada con cuentas autorizadas se presume valida para efectos
              operativos y de auditoria.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">4. Uso permitido y prohibiciones</h2>
            <p>
              Se prohibe utilizar MiVisita para fines ilicitos, para interferir con la operacion,
              intentar acceso no autorizado, alterar registros, realizar ingenieria inversa o vulnerar
              infraestructura, APIs o mecanismos de seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">5. Disponibilidad y soporte</h2>
            <p>
              Nexus Global realiza esfuerzos razonables para mantener disponibilidad continua, pero no
              garantiza ausencia total de interrupciones por mantenimiento, terceros, conectividad o
              eventos fuera de control razonable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">6. Propiedad intelectual</h2>
            <p>
              El software, diseno, logica y componentes asociados a MiVisita son propiedad de Nexus
              Global o sus licenciantes. El cliente recibe un derecho de uso no exclusivo y revocable
              conforme al acuerdo comercial aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">7. Datos y responsabilidad del cliente</h2>
            <p>
              La residencial es responsable por la veracidad de datos ingresados, cumplimiento legal y
              comunicacion de reglas internas a usuarios y visitantes. Nexus Global no reemplaza
              asesoria legal ni funciones de vigilancia fisica o decisiones de seguridad interna.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">8. Limitacion de responsabilidad</h2>
            <p>
              En la maxima medida permitida por la ley, Nexus Global no sera responsable por danos
              indirectos, lucro cesante, perdida de oportunidad, decisiones operativas del cliente o
              incidentes derivados de uso indebido, configuracion incorrecta o acceso no autorizado
              atribuible a la gestion del cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">9. Suspension y terminacion</h2>
            <p>
              Nexus Global podra suspender o limitar el servicio ante incumplimientos graves, uso
              abusivo, riesgos de seguridad, mora contractual o requerimientos legales aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">10. Modificaciones</h2>
            <p>
              Nexus Global puede actualizar estos terminos cuando sea necesario. La continuidad en el
              uso del servicio luego de su publicacion implica aceptacion de la version vigente.
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
