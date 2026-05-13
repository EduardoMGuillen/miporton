# MiVisita

MiVisita es una plataforma web (PWA) de control de acceso residencial: invitaciones con QR, validación en portería con evidencia fotográfica, reservas de zonas comunes, notificaciones push y reportes operativos por residencial.

## Roles en el producto

| Rol | Uso |
| --- | --- |
| **RESIDENT** | Crea invitaciones QR, reserva zonas, recibe comunicados y alertas. |
| **GUARD** | Escanea QR, registra evidencia, anuncia delivery, confirma llegadas y salidas. |
| **RESIDENTIAL_ADMIN** | Gestiona usuarios, zonas, comunicados, QRs de administración y reportes de su residencial. |

El repositorio incluye además el rol `SUPER_ADMIN` para operación global de la plataforma; **no se documenta aquí**.

---

## Público (sin sesión)

- **Landing** (`/`): presentación del producto y acceso a inicio de sesión.
- **Políticas de privacidad** y **Términos de uso** con enlaces desde el pie de página.
- **Recuperación de contraseña**: solicitud de enlace por correo (`/forgot-password`) y restablecimiento (`/reset-password`) vía Resend.
- **PWA / modo offline**: manifiesto y página **`/offline`** cuando no hay conexión.

---

## Residente (`/resident`)

Panel principal orientado a visitas y zonas comunes, con interfaz en **español o inglés** (selector en el menú de cuenta).

### Inicio

- **Crear invitación QR** con:
  - Vigencias: un solo uso, un día, tres días o sin vencimiento (según lo que habilite la administración de la residencial).
  - Nombre de la visita, descripción opcional y tipo de acceso **peatonal** o **vehículo**.
- Listado de **QRs activos** y **expirados o agotados** (listado de expirados acotado para rendimiento).
- **Compartir / exportar** imagen del QR.
- **Eliminar** invitaciones propias.
- **Reservas de zonas comunes**: crear reserva en franjas permitidas por la zona; **editar** fecha/horario (según reglas); **cancelar** la propia.
- Accesos rápidos desde el inicio según configuración de la residencial.

### Menú de cuenta

- **Inicio**, **Anuncios**, **Mi perfil**, **Soporte**, **Sugerencias**, **Ajustes**.
- **Anuncios**: últimos **cinco** comunicados enviados por la administración a tu usuario para tu residencial.
- **Soporte**: enlace a **WhatsApp** si la residencial configuró teléfono de soporte; bloque con el **último comunicado** recibido.
- **Sugerencias**: envío de mensajes al equipo administrativo de la residencial.
- **Ajustes**: notificaciones push en el dispositivo y datos de contacto personal.
- **Idioma** (ES / EN), **actualizar vista** y **cerrar sesión**.

### Mi perfil

- Datos de cuenta: nombre, correo de acceso, residencial, vivienda, categoría (propietario / inquilino).
- **Contacto personal**: correo personal y teléfono opcionales (formulario dedicado).

### Notificaciones

- Suscripción a **Web Push** (VAPID) para alertas (por ejemplo visitas anunciadas, delivery en entrada, comunicados).

---

## Guardia (`/guard`)

- **Escaneo de QR** de visitas con validación contra la residencial de la sesión.
- **Evidencia en ingreso**:
  - Foto de identificación.
  - Foto de placa **obligatoria** cuando el QR indica acceso con vehículo.
- **Visitas anunciadas pendientes**: invitaciones vigentes aún sin primer escaneo; **confirmación manual de llegada** con el mismo flujo de evidencia.
- **Delivery en entrada**: selección de residente y notificación push inmediata.
- **Reservas de zonas del día** (zona horaria Tegucigalpa): vista para caseta con horario y nota.
- **Salida manual**: listado de entradas válidas sin salida registrada; confirmación de salida (alternativa al re-escaneo del QR).
- **Historial**: últimos anuncios registrados (acordeón) y **refresco automático** de la vista.
- Suscripción a **notificaciones push** para el puesto de guardia.

---

## Administración residencial (`/residential-admin`)

Navegación por secciones (menú lateral en escritorio, desplegable en móvil).

### Usuarios

- Alta de **residentes** (categoría dueño o inquilino, vivienda, etc.) y **guardias**; edición y eliminación de usuarios de la residencial.
- **Suspensión y reactivación** temporal de cuentas; los suspendidos no pueden iniciar sesión.
- **Filtros**: texto (nombre, correo, vivienda), rol y estado activo/suspendido.
- **Copiar credenciales** al portapapeles y **contraseña de un solo uso** con controles dedicados por usuario.

### Zonas y reservas

- **Alta de zonas** comunes con reglas (horario operativo, duración máxima por reserva, límite de una reserva por día, bloques de hora completa cuando aplique).
- **Bloqueo** de rangos fecha/hora por administración.
- **Visualización y cancelación** de reservas de residentes.

### Comunicados

- Envío de **comunicados** con título y mensaje (hasta 500 caracteres) y notificación push a destinatarios:
  - Todos los residentes.
  - Solo **propietarios**.
  - **Residentes seleccionados** (lista con casillas).
- Historial reciente de envíos con fecha y cantidad de destinatarios.

### Sugerencias

- Lectura de **sugerencias** enviadas por residentes.

### QR administración

- **Generación de QRs** de administración (visitante, vigencia, modo peatonal/vehículo, etc.).
- Listado de QRs **activos** y **expirados** con acciones de compartir y **revocación** donde corresponda.

### Registro y reportes

- **Registro de entradas** con filtros avanzados (fechas, tipos de evento, búsqueda, etc.).
- **Exportación PDF** por registro individual.
- **Reporte mensual PDF** (entradas y delivery, con referencia a evidencia disponible según retención).

### Configuración

- **Teléfono de soporte** residencial (usado en el enlace WhatsApp del residente).
- **Política de vigencias QR** para residentes: qué tipos de duración pueden usar al crear invitaciones (activar/desactivar por tipo).
- **Notificaciones**: activación de alertas para la cuenta del administrador en el dispositivo.

---

## Seguridad, evidencia y suspensión por residencial

- Evidencias de ingreso almacenadas en base de datos: foto de **ID** y foto de **placa** cuando aplica.
- **Retención**: purga automática de bytes de evidencia a los **60 días**; el registro del evento se conserva.
- Acceso a escaneo y consultas acotado por **residencial** de la sesión.
- Si la residencial está **suspendida** a nivel plataforma, los usuarios de esa residencial (excepto operación global) **no pueden operar** hasta reactivación.

---

## Stack técnico

- Next.js (App Router)
- React + TypeScript
- Prisma ORM
- PostgreSQL (Supabase recomendado)
- Web Push (VAPID)
- jsPDF (documentos)
- JSZip (empaquetado en utilidades de respaldo donde existan)

## Requisitos

- Node.js 20+
- npm 10+
- Base de datos PostgreSQL

## Variables de entorno

Crea `.env` con:

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CONTACT_EMAIL=

CRON_SECRET=

# Recuperación de contraseña (Resend)
RESEND_API_KEY=
EMAIL_FROM=
# Opcional: enlace WhatsApp para plantilla de correo (ej. https://wa.me/504XXXXXXXX)
NEXT_PUBLIC_WHATSAPP_URL=
```

## Migraciones

### Opción A: Prisma (recomendada en entorno controlado)

```bash
npm run prisma:generate
npm run prisma:push
```

### Opción B: SQL manual (Supabase SQL Editor)

Ejecutar en orden:

1. `prisma/migrations/20260306113000_full_feature_foundation/migration.sql`
2. `prisma/migrations/20260306213000_residential_support_phone/migration.sql`
3. `prisma/migrations/20260306222000_resident_suggestions/migration.sql`
4. `prisma/migrations/20260307101000_residential_suspension_control/migration.sql`
5. `prisma/migrations/20260323130000_user_suspension_and_residential_qr_policy/migration.sql`

Luego:

```bash
npm run prisma:generate
```

## Desarrollo local

```bash
npm install
npm run prisma:generate
npm run dev
```

Abrir `http://localhost:3000`.

## Scripts útiles

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:push
```

## Cron interno

En `vercel.json` se mantiene:

- `/api/internal/purge-id-evidence`
  - Borra bytes de evidencia vencida (60 días).

## Operación recomendada

- Generar y archivar **reportes mensuales PDF** por residencial desde el panel de administración.
- Mantener `AUTH_SECRET` y llaves VAPID fuera del repositorio.
- Revisar el volumen de evidencia almacenada si el tráfico de visitas es alto.
