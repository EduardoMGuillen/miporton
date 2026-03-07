# MiVisita App

Plataforma de control de acceso residencial con PWA, notificaciones push y paneles por rol:

- Super Admin
- Admin Residencial
- Residente
- Guardia

## Funcionalidades principales

- Invitaciones de visita con QR (1 uso, 1 dia, 3 dias, infinita).
- Escaneo de QR en porteria con evidencia de ID y foto de placa cuando aplica.
- Notificaciones push en tiempo real (llegadas, deliveries, comunicados y reservas).
- Registro de entradas con filtros, vista de evidencia y exportacion PDF por registro.
- Reporte mensual PDF de entradas y delivery.
- Zonas comunes con reservas por fecha/hora, bloqueos y limite de horas por reserva.
- Cotizaciones y contratos de servicio en Super Admin con generacion PDF.
- Retencion de evidencias sensible por politica (60 dias).

## Stack tecnico

- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL (Supabase)
- Web Push (Service Worker + VAPID)
- jsPDF para exportes

## Requisitos

- Node.js 20+
- npm
- Base de datos PostgreSQL (Supabase recomendado)

## Variables de entorno

Crea tu `.env` con al menos:

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

## Migraciones SQL en Supabase

Si aplicas migraciones manualmente en Supabase SQL Editor, ejecuta:

1. `prisma/migrations/20260306113000_full_feature_foundation/migration.sql`

Luego en local:

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

## Comandos utiles

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
```

## Cron jobs en Vercel

Configurados en `vercel.json`:

- `/api/internal/purge-id-evidence` (purga de evidencias antiguas)
