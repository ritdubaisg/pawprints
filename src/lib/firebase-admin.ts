import * as admin from "firebase-admin";

function formatPrivateKey(key: string) {
  return key.replace(/\\n/g, "\n");
}

export function initFirebaseAdmin() {
  if (!admin.apps.length) {
    // Env names match server-config.ts — the two must not drift, or the admin
    // SDK silently falls back to application default credentials and every
    // account action fails at runtime instead of at boot.
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:
            process.env.FIREBASE_PROJECT_ID ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
        }),
      });
    } else {
      // Fallback to default application credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
      admin.initializeApp();
    }
  }
  return admin;
}

/** The Admin Auth instance used for issuing and managing password accounts. */
export function getAdminAuth() {
  return initFirebaseAdmin().auth();
}
