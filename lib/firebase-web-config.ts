/**
 * Config Firebase Web (PWA/APK Android con FCM), igual que gcbmesas.
 * En Vercel (o .env.local):
 *
 *   NEXT_PUBLIC_FIREBASE_API_KEY=...
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
 *   NEXT_PUBLIC_FIREBASE_APP_ID=...
 *   FIREBASE_SERVICE_ACCOUNT_JSON={...}   // para enviar desde el servidor
 */

export function getFirebaseWebConfig(): {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  authDomain?: string;
  storageBucket?: string;
} | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  if (!apiKey || !projectId || !messagingSenderId || !appId) return null;
  return {
    apiKey,
    projectId,
    messagingSenderId,
    appId,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || undefined,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
  };
}
