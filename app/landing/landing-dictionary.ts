import type { LandingLocale } from "@/lib/landing-locale";

const KEYS = {
  "nav.install": { es: "Instalar app", en: "Install app" },
  "nav.login": { es: "Iniciar sesión", en: "Log in" },
  "nav.langHint": { es: "Idioma (solo esta página)", en: "Language (this page only)" },
  "hero.badge": { es: "Control de acceso residencial", en: "Residential access control" },
  "hero.title": {
    es: "Visitas bajo control. Residentes informados. Portería ágil.",
    en: "Visits under control. Residents informed. Faster front desk.",
  },
  "hero.subtitle": {
    es: "MiVisita une residentes, guardias y administración en una PWA moderna: QR con reglas claras, evidencia en ingreso, reservas de zonas, push en vivo y reportes PDF listos para auditoría.",
    en: "MiVisita connects residents, guards, and management in a modern PWA: QR with clear rules, entry evidence, amenity bookings, live push alerts, and PDF reports ready for audits.",
  },
  "hero.ctaPrimary": { es: "Hablar por WhatsApp", en: "Message on WhatsApp" },
  "hero.ctaSecondary": { es: "Solicitar información", en: "Request information" },
  "hero.ctaLogin": { es: "Entrar a la app", en: "Open the app" },
  "stats.qr": { es: "QR con vigencia y uso", en: "QR with time & use limits" },
  "stats.push": { es: "Push en tiempo real", en: "Real-time push" },
  "stats.pdf": { es: "Reportes PDF", en: "PDF reports" },
  "marquee.title": { es: "Todo en un solo flujo operativo", en: "One streamlined operations flow" },
  "feat.mainTitle": { es: "Tres paneles, un mismo estándar", en: "Three dashboards, one standard" },
  "feat.mainSubtitle": {
    es: "Cada rol ve lo que necesita, sin ruido: menos llamadas a caseta, más trazabilidad.",
    en: "Each role sees what matters: fewer gate calls, more traceability.",
  },
  "feat.res.title": { es: "Residente", en: "Resident" },
  "feat.res.desc": {
    es: "Invitaciones con QR, compartir imagen, reservas de zonas comunes (crear, editar, cancelar), anuncios de la administración, sugerencias, soporte por WhatsApp de la residencial, perfil y contacto personal, notificaciones push, español e inglés en la app.",
    en: "QR invites, share image, common-area bookings (create, edit, cancel), admin announcements, suggestions, residential WhatsApp support, profile and personal contact, push notifications, Spanish and English in the app.",
  },
  "feat.guard.title": { es: "Guardia", en: "Guard" },
  "feat.guard.desc": {
    es: "Escaneo de QR, evidencia de identificación, placa obligatoria si hay vehículo, confirmación manual de llegada, delivery en entrada con aviso inmediato al residente, reservas del día para caseta, salida manual, historial reciente y actualización automática de la vista, push.",
    en: "QR scanning, ID evidence, plate capture when vehicle access applies, manual arrival confirmation, front-desk delivery with instant resident alert, today’s amenity bookings for the booth, manual exit, recent history with auto-refresh, push.",
  },
  "feat.admin.title": { es: "Administración residencial", en: "Residential management" },
  "feat.admin.desc": {
    es: "Usuarios (residentes e inquilinos/dueños, guardias), suspensión temporal, filtros, credenciales y OTP, zonas y bloqueos, reservas, comunicados (todos, solo dueños o seleccionados), sugerencias, QR de administración, registro con filtros, exportes PDF y reporte mensual, política de vigencias QR para residentes, teléfono de soporte, notificaciones.",
    en: "Users (residents with owner/tenant category, guards), temporary suspension, filters, credentials and OTP, zones and blocks, bookings, announcements (all, owners only, or selected), suggestions, admin QR codes, entry log with filters, PDF exports and monthly report, resident QR duration policy, support phone, notifications.",
  },
  "how.title": { es: "Cómo funciona", en: "How it works" },
  "how.s1t": { es: "Residente anuncia", en: "Resident announces" },
  "how.s1d": { es: "Crea el QR con reglas claras y lo comparte con su visita.", en: "Creates the QR with clear rules and shares it with the visitor." },
  "how.s2t": { es: "Caseta valida", en: "Gate validates" },
  "how.s2d": { es: "Escaneo, evidencia cuando aplica y registro instantáneo.", en: "Scan, evidence when required, and instant logging." },
  "how.s3t": { es: "Alertas al instante", en: "Instant alerts" },
  "how.s3d": { es: "Llegadas, delivery y comunicados llegan por push.", en: "Arrivals, deliveries, and announcements via push." },
  "how.s4t": { es: "Gestión y reportes", en: "Management & reports" },
  "how.s4d": { es: "Administración revisa entradas, reservas y exporta PDF.", en: "Management reviews entries, bookings, and exports PDFs." },
  "trust.title": { es: "Seguridad y cumplimiento operativo", en: "Security and operational compliance" },
  "trust.t1": { es: "Evidencia de ID y placa almacenada con política de retención (purga automática de bytes sensibles a 60 días; el evento se conserva).", en: "ID and plate evidence stored with retention policy (automatic purge of sensitive bytes at 60 days; the event record remains)." },
  "trust.t2": { es: "PWA instalable: misma experiencia en web, Android e iOS.", en: "Installable PWA: same experience on web, Android, and iOS." },
  "trust.t3": { es: "Acceso acotado por residencial en escaneo y consultas.", en: "Residential-scoped access for scans and queries." },
  "trust.t4": { es: "Recuperación de contraseña por correo y páginas legales integradas.", en: "Password recovery by email and built-in legal pages." },
  "ctaBand.title": { es: "¿Tu residencial aún usa listas en papel?", en: "Is your community still on paper lists?" },
  "ctaBand.sub": {
    es: "Digitaliza portería y comunicación con residentes sin fricción. Te respondemos con alcance, tiempos y siguiente paso.",
    en: "Digitize the gate and resident communication without friction. We reply with scope, timelines, and next steps.",
  },
  "contact.title": { es: "Hablemos de tu proyecto", en: "Let’s talk about your project" },
  "contact.sub": {
    es: "Escríbenos por WhatsApp o deja tus datos: el mensaje llega directo a nuestro equipo.",
    en: "Write us on WhatsApp or leave your details—the message goes straight to our team.",
  },
  "contact.whatsappCard": { es: "Respuesta rápida por WhatsApp", en: "Quick reply on WhatsApp" },
  "contact.whatsappBtn": { es: "Abrir WhatsApp", en: "Open WhatsApp" },
  "contact.whatsappOff": {
    es: "Configura NEXT_PUBLIC_WHATSAPP_URL en el servidor para mostrar el botón.",
    en: "Set NEXT_PUBLIC_WHATSAPP_URL on the server to show the button.",
  },
  "form.name": { es: "Nombre completo", en: "Full name" },
  "form.email": { es: "Correo electrónico", en: "Email" },
  "form.phone": { es: "Teléfono (opcional)", en: "Phone (optional)" },
  "form.residential": { es: "Residencial o ciudad (opcional)", en: "Community or city (optional)" },
  "form.message": { es: "¿Qué necesitas?", en: "What do you need?" },
  "form.placeholderMsg": {
    es: "Ej.: número de casas, portería 24/7, integración con cámaras…",
    en: "E.g.: number of homes, 24/7 gatehouse, camera integration…",
  },
  "form.submit": { es: "Enviar solicitud", en: "Send request" },
  "form.pending": { es: "Enviando…", en: "Sending…" },
  "form.success": {
    es: "¡Listo! Revisa tu correo por si acaso necesitamos aclarar algo.",
    en: "Done! Check your inbox in case we need any clarification.",
  },
  "form.errorNetwork": { es: "No se pudo enviar. Intenta de nuevo o usa WhatsApp.", en: "Could not send. Try again or use WhatsApp." },
  "form.errorConfig": {
    es: "El envío de correo no está configurado en el servidor todavía.",
    en: "Email sending is not configured on the server yet.",
  },
  "form.err.name_short": { es: "Indica al menos 2 caracteres.", en: "Enter at least 2 characters." },
  "form.err.email_invalid": { es: "Correo no válido.", en: "Invalid email address." },
  "form.err.message_short": { es: "Escribe un poco más de detalle (15+ caracteres).", en: "Add a bit more detail (15+ characters)." },
  "bottom.install": { es: "Instalar en tu teléfono", en: "Install on your phone" },
  "bottom.login": { es: "Ya tengo cuenta", en: "I already have an account" },
  "bottom.readyTitle": { es: "¿Listo para probarlo?", en: "Ready to try it?" },
  "bottom.readySub": {
    es: "Instala la PWA o entra con tu cuenta.",
    en: "Install the PWA or sign in with your account.",
  },
  "contact.noteTitle": { es: "MiVisita", en: "MiVisita" },
  "contact.noteBody": {
    es: "Los mensajes del formulario se envían al equipo comercial. No sustituye el soporte de tu residencial dentro de la app.",
    en: "Form messages go to the commercial team. This is not a substitute for your community’s in-app support.",
  },
} as const;

export type LandingCopyKey = keyof typeof KEYS;

export function landingT(locale: LandingLocale, key: LandingCopyKey): string {
  return KEYS[key][locale];
}

export const LANDING_MARQUEE: Record<LandingLocale, string[]> = {
  es: [
    "QR con vigencia",
    "Evidencia ID / placa",
    "Reservas de zonas",
    "Push en vivo",
    "Delivery en entrada",
    "Comunicados masivos",
    "Reporte mensual PDF",
    "Suspensión de usuarios",
    "PWA instalable",
    "Sugerencias de residentes",
    "Filtros de registro",
    "QR administración",
  ],
  en: [
    "Time-bound QR",
    "ID / plate evidence",
    "Amenity bookings",
    "Live push",
    "Front-desk delivery",
    "Mass announcements",
    "Monthly PDF report",
    "User suspension",
    "Installable PWA",
    "Resident suggestions",
    "Log filters",
    "Admin QR codes",
  ],
};
