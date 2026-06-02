/**
 * Alcance comercial del servicio MiVisita para contratos.
 * Incluye residente, guardia y administración residencial. Sin funciones de super administración.
 */

export const MIVISITA_CONTRACT_INTRO =
  "MiVisita es una plataforma web progresiva (PWA) para control de acceso, visitas y operación diaria de conjuntos residenciales. El alcance contratado comprende los siguientes módulos y capacidades operativas:";

export type ContractScopeSection = {
  title: string;
  items: string[];
};

export const MIVISITA_CONTRACT_SCOPE_SECTIONS: ContractScopeSection[] = [
  {
    title: "3.1. Módulo residente",
    items: [
      "Generación de invitaciones con código QR para visitas, con nombre de visita, descripción opcional e indicación de acceso peatonal o vehicular.",
      "Configuración de vigencia del QR según políticas definidas por la administración de la residencial (uso único, un día, tres días o vigencia extendida cuando esté habilitada).",
      "Compartir el pase de visita en formato imagen o PDF para envío a la visita.",
      "Consulta de invitaciones activas y expiradas desde la aplicación.",
      "Reserva de zonas comunes: selección de zona, fecha, hora de inicio y duración en bloques horarios, sujeta a reglas de la zona (horario permitido, máximo de horas, un reserva por día en la zona si aplica, días de la semana habilitados y disponibilidad).",
      "Edición y cancelación de reservas propias aprobadas.",
      "Recepción de comunicados de la administración y consulta de anuncios recientes.",
      "Envío de sugerencias a la administración de la residencial.",
      "Acceso a datos de contacto o soporte de la residencial (incluido enlace de WhatsApp cuando esté configurado).",
      "Gestión de perfil y datos de contacto personal.",
      "Notificaciones push en el dispositivo para eventos relevantes (por ejemplo, comunicados).",
      "Interfaz de la aplicación en español e inglés para el módulo residente.",
    ],
  },
  {
    title: "3.2. Módulo guardia (portería / caseta)",
    items: [
      "Panel de escaneo de QR para registro de entrada y de salida de visitas.",
      "Validación en tiempo real del QR (vigencia, uso, revocación y pertenencia a la residencial).",
      "Captura de evidencia fotográfica de identificación en el ingreso; captura de placa cuando la visita fue anunciada como vehicular.",
      "Confirmación manual de llegada para anuncios de visita pendientes.",
      "Registro de salida manual de visitas con entrada activa, además del escaneo de salida por QR.",
      "Anuncio de delivery o paquetería en entrada: notificación inmediata al residente seleccionado.",
      "Consulta de reservas de zonas comunes del día para coordinación en caseta.",
      "Listado de anuncios pendientes, entradas pendientes de salida y últimos registros de acceso.",
      "Actualización periódica de la vista operativa y alertas push para nuevas visitas anunciadas.",
    ],
  },
  {
    title: "3.3. Módulo administración residencial",
    items: [
      "Gestión de usuarios de la residencial: residentes (categoría propietario o inquilino), guardias y administradores residenciales; alta, edición y suspensión temporal de acceso.",
      "Emisión y restablecimiento de credenciales; contraseña temporal (OTP) de un solo uso para residentes cuando aplique.",
      "Copia de credenciales para entrega segura al usuario.",
      "Configuración de zonas comunes: nombre, descripción, horario de operación por hora, máximo de horas por reserva, límite de una reserva por día en la zona (opcional) y días de la semana habilitados para reservas.",
      "Bloqueos de horario en zonas por rango de fecha y hora (mantenimiento o eventos).",
      "Calendario y listado de reservas de zonas con filtros por mes y estado; cancelación de reservas por administración.",
      "Comunicados a residentes: todos, solo propietarios o residentes seleccionados.",
      "Revisión de sugerencias enviadas por residentes.",
      "Generación de códigos QR de administración (acceso general o a nombre de un residente) con las mismas reglas de vigencia operativas.",
      "Consulta de registros de acceso (entradas y salidas) con filtros y exportación a PDF.",
      "Reporte mensual en PDF de actividad de la residencial.",
      "Política de tipos de vigencia QR permitidos para residentes (activar o desactivar por tipo).",
      "Teléfono o canal de soporte visible para residentes en la aplicación.",
      "Envío de notificaciones push a residentes y guardias según eventos de la plataforma.",
    ],
  },
  {
    title: "3.4. Características generales de la plataforma",
    items: [
      "Aplicación instalable como PWA en navegadores compatibles de escritorio y móvil.",
      "Sesiones seguras por rol; cada usuario accede únicamente a las funciones de su perfil y de su residencial.",
      "Recuperación de contraseña por correo electrónico.",
      "Política de retención de evidencias sensibles (fotografías de identificación y placa): purga automática de archivos binarios conforme a la configuración vigente de la plataforma, conservando el registro del evento de acceso.",
      "Páginas de términos de uso y política de privacidad integradas en la aplicación.",
    ],
  },
];

export const MIVISITA_CONTRACT_SCOPE_EXCLUSION =
  "Quedan expresamente fuera del alcance de este contrato las funciones de administración centralizada multi-residencial, operación de infraestructura global de la plataforma y cualquier desarrollo a medida no descrito en el presente documento o en un anexo firmado.";

/** Responsabilidades del cliente y alcance del proveedor (redacción comercial, no asesoría legal). */
export const MIVISITA_CONTRACT_RESPONSIBILITY_SECTION_TITLE =
  "4. Uso de la plataforma y alcance de responsabilidades";

export const MIVISITA_CONTRACT_RESPONSIBILITY_CLAUSES: string[] = [
  "Nexus Global y MiVisita ponen a disposición una herramienta tecnológica de apoyo. La gestión cotidiana —altas de usuarios, roles, políticas de acceso, comunicados, bloqueos, reservas y demás ajustes— la realiza la administración residencial y el personal que el cliente autorice.",
  "El uso de la aplicación por residentes, guardias o administradores, así como las decisiones de portería y administración, son competencia del cliente; Nexus Global y MiVisita no participan en esas decisiones ni en sus efectos en el conjunto.",
  "El cliente procurará registrar información veraz, resguardar credenciales y orientar a su personal en el uso correcto de la plataforma.",
  "MiVisita facilita el registro y control de visitas; complementa, sin sustituir, la vigilancia física en caseta y los protocolos internos de la residencial.",
  "Nexus Global y MiVisita buscarán mantener el servicio en condiciones normales de operación. Podrán aplicarse mantenimientos o actualizaciones puntuales, procurando avisar con antelación cuando sea posible.",
  "Dentro de este acuerdo no se contemplan reclamos por interrupciones menores del servicio, por situaciones derivadas del uso o de la configuración que adopte la residencial, ni por daños indirectos; sí la atención de incidencias técnicas razonablemente atribuibles al servicio contratado.",
  "Si un tercero presenta un reclamo vinculado al uso de la plataforma por usuarios del cliente, este atenderá el caso como interlocutor principal; Nexus Global podrá colaborar en lo razonable cuando el origen sea técnico y quede documentado.",
];

export const MIVISITA_CONTRACT_DEFAULT_ADDITIONAL_TERMS =
  "Cualquier desarrollo, integración con terceros (cámaras, ERP, facturación externa) o personalización no listada en el alcance del servicio se cotizará por separado mediante anexo. El cliente se compromete a designar un representante operativo para coordinación de altas de usuarios y capacitación inicial del personal de portería y administración.";
