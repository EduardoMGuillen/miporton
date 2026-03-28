# Plan: MiVisita → Google Play Store & Apple App Store

> [!CAUTION]
> **3 gaps críticos encontrados al revisar el código actual** (detallados en Fase 0)

## Descripción del Proyecto

**MiVisita** es una app Next.js 15 (React 19) deployada en Vercel. Usa:
- **Autenticación**: Cookie HTTP-Only con JWT (`mivisita_session`) vía middleware de Next.js
- **Base de datos**: Prisma + Neon (Postgres en la nube)
- **Notificaciones**: Web-push VAPID (`webpush` package)
- **QR**: `html5-qrcode` (usa cámara del navegador vía `getUserMedia`)
- **PDFs / ZIPs**: `jspdf` + `jszip` (descarga de archivos)
- **PWA**: Ya tiene [manifest.ts](file:///c:/Users/Eduar/OneDrive/Documents/Cursor/Mivisita%20-%20Antigravity/miporton/app/manifest.ts) + `appleWebApp` meta tags

La app **ya es una PWA**. Esto abre dos caminos posibles:

---

## Estrategia Recomendada: TWA (Trusted Web Activity) para Android + PWA Kit para iOS

> [!IMPORTANT]
> **Esta es la ruta más rápida y de menor riesgo** porque no requiere reescribir código. La app sigue corriendo en Vercel tal como hoy; solo envolvemos la URL en una shell nativa.

| | Android (TWA) | iOS (WKWebView / PWA Kit) |
|---|---|---|
| ¿Cambia el código de Next.js? | ❌ Casi nada | ❌ Casi nada |
| ¿Admitida en la tienda? | ✅ Sí, Google la acepta | ✅ Sí, Apple la acepta |
| ¿Notificaciones push nativas? | ✅ Web-push funciona en Chrome/Android | ⚠️ Requiere iOS 16.4+ |
| ¿Acceso a cámara para QR? | ✅ Funciona vía browser engine | ✅ Funciona vía WKWebView |
| Esfuerzo de desarrollo | ~1–2 días | ~2–4 días |
| Costo de herramientas | Gratis | Requiere Mac / servicio en la nube |

---

## Fase 0 – Corregir gaps críticos ANTES de todo ⚠️

Al revisar el código actual encontré estos 3 problemas que **bloquean** la publicación en Play Store:

### Gap 1 – `sw.js` NO EXISTE 🔴

El código registra `/sw.js` en [pwa-bootstrap.tsx](file:///c:/Users/Eduar/OneDrive/Documents/Cursor/Mivisita%20-%20Antigravity/miporton/app/components/pwa-bootstrap.tsx), [push-subscription.tsx](file:///c:/Users/Eduar/OneDrive/Documents/Cursor/Mivisita%20-%20Antigravity/miporton/app/guard/push-subscription.tsx) (residente, guardia, admin), pero **el archivo no está en `/public`**. Sin un Service Worker real funcionando, Google rechazará la app TWA con error de "offline page required".

#### [NEW] `public/sw.js`
```js
const CACHE = 'mivisita-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/login']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// Web Push — reenviar notificaciones al cliente
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'MiVisita', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data: { url: data.url ?? '/login' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((cs) => {
      const target = e.notification.data?.url ?? '/login';
      const existing = cs.find((c) => c.url.includes(target) && 'focus' in c);
      return existing ? existing.focus() : clients.openWindow(target);
    })
  );
});
```

#### [NEW] `app/offline/page.tsx`
```tsx
export default function OfflinePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#1d4ed8' }}>
      <h1>Sin conexión</h1>
      <p>Revisa tu conexión a internet e intenta de nuevo.</p>
    </div>
  );
}
```

### Gap 2 – Vercel no sirve `.well-known/` sin configuración 🔴

Vercel a veces bloquea rutas que empiezan con `.` por defecto. El archivo `assetlinks.json` debe ser accesible públicamente para que el TWA funcione sin barra de dirección.

#### [MODIFY] [vercel.json](file:///c:/Users/Eduar/OneDrive/Documents/Cursor/Mivisita%20-%20Antigravity/miporton/vercel.json)
```json
{
  "crons": [
    { "path": "/api/internal/purge-id-evidence", "schedule": "0 3 * * *" }
  ],
  "headers": [
    {
      "source": "/.well-known/(.*)",
      "headers": [{ "key": "Content-Type", "value": "application/json" }]
    }
  ]
}
```

### Gap 3 – Lighthouse PWA Score mínimo requerido 🟡

Google exige que la app pase el audit de Lighthouse con todas las métricas PWA en verde antes de que TWA pueda operar en modo "sin barra de dirección". Este paso de verificación faltaba en el plan.

**Acción**: Después de deployar Fase 1 en Vercel, verificar en [PageSpeed Insights](https://pagespeed.web.dev/) que la sección "Progressive Web App" está completamente en verde.

---

## Fase 1 – Preparar la PWA (cambios en el código Next.js)

Antes de empaquetar para cualquier tienda, la app necesita estas mejoras:

### 1A. Iconos de alta resolución

Actualmente `logomivisita.png` se usa para todos los tamaños. Las tiendas exigen:
- **Android**: `512x512 px` (PNG sin transparencia para la Play Store)
- **iOS**: `1024x1024 px` (PNG sin transparencia para App Store Connect)
- Además: `192x192`, `384x384`, `48x48`, `72x72`, `96x96`, `144x144`

**Acción**: Generar un set de iconos a partir del logo original en todos los tamaños correctos.

#### [MODIFY] [manifest.ts](file:///c:/Users/Eduar/OneDrive/Documents/Cursor/Mivisita%20-%20Antigravity/miporton/app/manifest.ts)
Agregar todos los tamaños de icono explícitamente y el campo `screenshots` (requerido por Play Store para apps de pantalla completa).

```ts
// Agregar sizes específicos: 48, 72, 96, 144, 192, 384, 512
icons: [
  { src: "/icons/icon-48.png",   sizes: "48x48",   type: "image/png" },
  { src: "/icons/icon-72.png",   sizes: "72x72",   type: "image/png" },
  { src: "/icons/icon-96.png",   sizes: "96x96",   type: "image/png" },
  { src: "/icons/icon-144.png",  sizes: "144x144", type: "image/png" },
  { src: "/icons/icon-192.png",  sizes: "192x192", type: "image/png", purpose: "any maskable" },
  { src: "/icons/icon-384.png",  sizes: "384x384", type: "image/png" },
  { src: "/icons/icon-512.png",  sizes: "512x512", type: "image/png", purpose: "any maskable" },
],
```

### 1B. Verificar que el Service Worker maneja `offline`

Google Play exige que una PWA tenga una página offline funcional. Verificar que el SW responda cuando no hay red.

### 1C. HTTPS y `assetlinks.json` (solo Android TWA)

Para que Android TWA funcione sin error de "verificación de dominio", hay que publicar en el servidor un archivo especial:

#### [NEW] `public/.well-known/assetlinks.json`
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.mivisita.app",
    "sha256_cert_fingerprints": ["<fingerprint del keystore que generarás>"]
  }
}]
```
Este archivo le dice a Android que la app de la Play Store es dueña del dominio, eliminando la barra de dirección.

---

## Fase 2 – App de Android (TWA con Bubblewrap)

**Bubblewrap** es la herramienta oficial de Google para crear apps TWA a partir de una URL/PWA.

### Paso 2.1 – Instalar prerequisitos
```bash
# Node ya instalado. Instalar Bubblewrap globalmente:
npm install -g @bubblewrap/cli

# Bubblewrap descargará automáticamente:
# - JDK 11 (Java Development Kit)
# - Android SDK / Build Tools
```

### Paso 2.2 – Inicializar el proyecto Android
```bash
mkdir miporton-android && cd miporton-android
bubblewrap init --manifest https://miporton.vercel.app/manifest.webmanifest
```
Esto genera un proyecto Android Studio listo. Te pedirá interactivamente:
- `Package ID`: `com.mivisita.app`
- `App name`: `MiVisita`
- `App version`: `1`
- Signing keystore (se crea uno nuevo)

> [!WARNING]
> **Guarda el archivo `.keystore` y su contraseña en un lugar seguro.** Si lo pierdes, nunca podrás actualizar tu app en la Play Store. No hay recuperación posible.

### Paso 2.3 – Generar el fingerprint para `assetlinks.json`
```bash
bubblewrap fingerprint add
```
Copia el SHA-256 que genera y pégalo en el `assetlinks.json` del paso 1C.

### Paso 2.4 – Construir el APK / AAB
```bash
bubblewrap build
```
Genera `app-release-bundle.aab` (el formato que exige Google Play).

### Paso 2.5 – Subir a Google Play
1. Ir a [play.google.com/console](https://play.google.com/console)
2. Crear aplicación → `com.mivisita.app`
3. Subir el `.aab` en **Pruebas internas** primero
4. Completar la ficha de la tienda (descripciones, capturas, política de privacidad)
5. Esperar aprobación (~1–3 días para internal testing, luego producción)

---

## Fase 3 – App de iOS (WKWebView con Capacitor o PWA Builder)

iOS es más complejo. Hay dos opciones:

### Opción A – PWA Builder (Microsoft) — Sin código nativo, solo en Mac
[PWA Builder](https://www.pwabuilder.com) genera un proyecto Xcode automáticamente desde la URL de tu PWA. Es similar a Bubblewrap pero para iOS.

### Opción B – Capacitor (recomendada si quieres soporte completo)
Capacitor es la solución más robusta. Si en el futuro quieres acceder a la cámara nativa, Bluetooth, etc., Capacitor lo permite fácilmente via plugins.

> [!IMPORTANT]
> **Para iOS necesitarás obligatoriamente acceso a una Mac con Xcode instalado, o usar un servicio cloud como [Codemagic](https://codemagic.io/) o [EAS Build](https://expo.dev/eas).** El build final SIEMPRE debe hacerse desde macOS.

#### [NEW] Proyecto Capacitor (carpeta separada: `miporton-capacitor/`)

```bash
# 1. Crear carpeta del proyecto wrapper
mkdir miporton-capacitor && cd miporton-capacitor
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 2. Inicializar Capacitor apuntando a tu URL deployada
npx cap init MiVisita com.mivisita.app --web-dir=""

# 3. Modificar capacitor.config.ts para usar la URL de Vercel
```

```ts
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.mivisita.app',
  appName: 'MiVisita',
  // Apunta a la app ya deployada en Vercel, no a archivos locales
  server: {
    url: 'https://miporton.vercel.app',
    cleartext: false,
  },
};
export default config;
```

```bash
# 4. Agregar plataformas
npx cap add android
npx cap add ios  # Solo si tienes Mac

# 5. Abrir en Android Studio
npx cap open android
```

#### Problema crítico de Autenticación con cookies en iOS

La app usa cookies HTTP-Only (`mivisita_session`). WKWebView (el motor de iOS) **bloquea las cookies cross-origin por defecto**. 

**Solución sin cambiar el backend**: Configurar Capacitor para que el WKWebView acepte cookies del dominio de Vercel:

```ts
// capacitor.config.ts
server: {
  url: 'https://miporton.vercel.app',
  allowNavigation: ['miporton.vercel.app'],
},
ios: {
  allowsLinkPreview: false,
  scrollEnabled: true,
  contentInset: 'automatic',
},
```

---

## Fase 4 – Push Notifications en Mobile

Actualmente la app usa **Web Push (VAPID)**. En Android esto funciona en Chrome WebView. En iOS requiere iOS 16.4+ y que el usuario haya aceptado permisos.

**Para notificaciones nativas reales** (que lleguen incluso con la app cerrada, en iOS 15 o inferior), necesitarías integrar **Firebase Cloud Messaging (FCM)**. Este es un trabajo adicional medio-avanzado. Por ahora la solución TWA/Capacitor con web-push funcionará para la mayoría de usuarios (Android + iOS 16.4+).

---

## Materiales Necesarios para Publicar

### Google Play Store
| Material | Especificación |
|---|---|
| Ícono de app | 512×512 px, PNG, sin transparencia |
| Imagen de cabecera | 1024×500 px, JPG/PNG |
| Capturas de pantalla | Mínimo 2, máx 8. Resolución 320–3840px. Teléfono (9:16) |
| Descripción corta | Máx 80 caracteres |
| Descripción larga | Máx 4000 caracteres |
| Política de Privacidad | URL pública (ya tienes `/politicas-de-privacidad`) |
| Costo cuenta | **$25 USD** (pago único) |

### Apple App Store
| Material | Especificación |
|---|---|
| Ícono de app | 1024×1024 px, PNG, sin transparencia, sin esquinas redondeadas |
| Capturas iPhone 6.5" | 1284×2778 px (mínimo 3) |
| Capturas iPhone 5.5" | 1242×2208 px (mínimo 3) |
| Descripción | Máx 4000 caracteres |
| Palabras clave | Máx 100 caracteres |
| URL soporte | Requerida (puede ser tu dominio) |
| Política de Privacidad | URL pública |
| Costo cuenta | **$99 USD/año** |

---

## Cronograma Estimado

| Fase | Tarea | Tiempo estimado |
|---|---|---|
| **0** | Generar set de iconos en todos los tamaños | 1 hora |
| **1** | Actualizar `manifest.ts` + `assetlinks.json` | 2 horas |
| **2** | Instalar Bubblewrap, generar AAB de Android | 3–5 horas |
| **3** | Subir a Google Play (Internal Testing), esperar aprobación | 1–3 días |
| **4** | Configurar Capacitor para iOS (en Mac o Codemagic) | 4–8 horas |
| **5** | Subir a App Store Connect, revisión de Apple | 1–7 días |
| **Total** | | ~2–3 semanas (con tiempos de espera de tiendas) |

---

## Cuentas y Costos Totales

| Concepto | Costo |
|---|---|
| Google Play Developer | $25 USD (único) |
| Apple Developer Program | $99 USD/año |
| Codemagic (build iOS en la nube, si no tienes Mac) | Gratis hasta 500 min/mes |
| Vercel (hosting actual) | Ya pagado |
| **Total inicial** | **~$124 USD** |

---

## Verificación

### Android (antes de publicar en producción)
1. Instalar el APK/AAB en un teléfono Android real via Android Studio o `adb install`
2. Verificar que el login funciona y la cookie se mantiene
3. Verificar que el escáner QR abre la cámara sin errores
4. Verificar que las notificaciones push llegan
5. Verificar que la descarga de PDF funciona
6. Verificar que NO aparece la barra de dirección del navegador (confirma que `assetlinks.json` está correcto)

### iOS (antes de publicar en producción)
1. Instalar en un iPhone físico via Xcode (requiere cuenta Apple)
2. Verificar login y persistencia de sesión (cookies en WKWebView)
3. Verificar cámara para QR
4. Verificar que los PDFs se abren correctamente
5. Probar en TestFlight con al menos 2-3 testers internos antes de enviar a revisión

> [!NOTE]
> **Recomendación de orden**: Empezar por Android, que es más rápdio y económico. Una vez que la app está en Google Play y probada, proceder con iOS.
