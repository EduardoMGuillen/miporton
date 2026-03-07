# MiVisita

MiVisita es una plataforma de control de acceso residencial con arquitectura multi-rol, PWA, escaneo QR en porteria, evidencia de ingreso y reporteria operativa.

## Roles del sistema

- `SUPER_ADMIN`
- `RESIDENTIAL_ADMIN`
- `RESIDENT`
- `GUARD`

## Funcionalidades implementadas

### Residente

- Creacion de invitaciones QR con vigencia:
  - `SINGLE_USE`
  - `ONE_DAY`
  - `THREE_DAYS`
  - `INFINITE`
- Campo de descripcion en QR.
- Indicador de visita con vehiculo.
- Compartir QR (acciones de compartir/exportar).
- Visualizacion de QRs activos y expirados.
- Reserva de zonas comunes por fecha/hora.
- Cancelacion de reserva propia.
- Boton de soporte por WhatsApp configurado por la residencial.
- Envio de sugerencias a la administracion.
- Suscripcion a notificaciones push.

### Guardia

- Escaneo de QR.
- Validacion con evidencia de identificacion.
- Evidencia de placa obligatoria cuando el QR indica vehiculo.
- Confirmacion manual de llegada para visitas anunciadas.
- Anuncio de delivery a residente con push inmediato.
- Vista de anuncios pendientes y recientes.

### Admin residencial

- Gestion de usuarios de su residencial (crear, editar, eliminar).
- Gestion de zonas:
  - alta de zonas
  - bloqueo de rangos de fecha/hora
  - limite de horas por reserva
- Visualizacion y cancelacion de reservas por admin.
- Comunicados push (todos o residentes seleccionados).
- Generacion de QR de administracion.
- Modulo QR admin con activos/expirados y acciones de compartir.
- Registro de entradas con filtros avanzados.
- Exportacion PDF por registro.
- Reporte mensual PDF (entradas + delivery, con evidencia disponible).
- Configuracion:
  - activacion de notificaciones
  - telefono de soporte residencial
- Vista de sugerencias de residentes.

### Super Admin

- Alta de residenciales con admin residencial inicial.
- Gestion de admins residenciales.
- Cotizador con PDF.
- Contrato de servicio con PDF profesional e impresion posterior.
- Registro global de entradas (por residencial) con filtros.
- Exportes PDF por registro y reporte mensual global.
- Backup manual de reportes:
  - ZIP con un PDF por residencial.
- Backup completo de base de datos:
  - ZIP con snapshot JSON de tablas principales
  - evidencia de escaneos serializada en base64.
- Switch de suspension temporal por residencial (activar/desactivar operacion).

## Seguridad, evidencia y retencion

- Evidencias de ingreso almacenadas en DB:
  - ID (`idPhotoData`)
  - placa (`platePhotoData`)
- Politica de retencion de evidencia:
  - purga automatica de bytes sensibles a los 60 dias
  - el registro operativo (evento) se mantiene.
- Control de acceso por residencial en escaneo y consultas.
- Si una residencial esta suspendida:
  - usuarios no super admin de esa residencial no pueden operar.

## Stack tecnico

- Next.js (App Router)
- React + TypeScript
- Prisma ORM
- PostgreSQL (Supabase recomendado)
- Web Push (VAPID)
- jsPDF (documentos)
- JSZip (backups ZIP)

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
```

## Migraciones

### Opcion A: Prisma (recomendada en entorno controlado)

```bash
npm run prisma:generate
npm run prisma:push
```

### Opcion B: SQL manual (Supabase SQL Editor)

Ejecutar en orden:

1. `prisma/migrations/20260306113000_full_feature_foundation/migration.sql`
2. `prisma/migrations/20260306213000_residential_support_phone/migration.sql`
3. `prisma/migrations/20260306222000_resident_suggestions/migration.sql`
4. `prisma/migrations/20260307101000_residential_suspension_control/migration.sql`

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

## Scripts utiles

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
  - borra bytes de evidencia vencida (60 dias).

## Operacion recomendada

- Ejecutar backup PDF por residencial de forma periodica.
- Ejecutar backup completo de DB antes de cambios mayores.
- Mantener `AUTH_SECRET` y llaves VAPID fuera de repositorio.
- Revisar peso de backups si hay alto volumen de evidencia.
