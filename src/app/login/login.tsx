"use server";

import { refreshCookiesWithIdToken } from "next-firebase-auth-edge/lib/next/cookies";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminAuth } from "@/lib/firebase-admin";
import {
  ALLOWED_EMAIL_DESCRIPTION,
  isAllowedEmail,
  normalizeEmail,
} from "@/lib/email-domain";

// See starter example for implementation: https://github.com/awinogrodzki/next-firebase-auth-edge/tree/main/examples/next-typescript-starter
import { authConfig } from "@/app/config/server-config";

export interface LoginResult {
  error: string;
}

/**
 * Server action: verifies the client's ID token, enforces the RIT-only rule,
 * syncs the user row, then sets the session cookies.
 *
 * The domain check has to happen before any cookie is written. Firebase will
 * happily mint a token for any Google account, so this action — not the
 * provider — is what actually gates the application.
 *
 * Returns `{ error }` for the client to display; the caller signs the Firebase
 * user out when it does. Anything else redirects.
 */
export async function loginAction(
  idToken: string,
): Promise<LoginResult | void> {
  let uid: string;
  let email: string;
  let name: string | undefined;

  try {
    // checkRevoked catches passwords that were regenerated and accounts that
    // were disabled since the token was issued.
    const decoded = await getAdminAuth().verifyIdToken(idToken, true);
    uid = decoded.uid;
    email = normalizeEmail(decoded.email ?? "");
    name = typeof decoded.name === "string" ? decoded.name : undefined;
  } catch (error) {
    console.error("Failed to verify ID token during login", error);
    return { error: "Could not verify your sign-in. Please try again." };
  }

  if (!uid || !email) {
    return { error: "Your account has no email address and cannot be used." };
  }

  if (!isAllowedEmail(email)) {
    return {
      error: `PawPrints is only open to the RIT community. Sign in with your ${ALLOWED_EMAIL_DESCRIPTION} address.`,
    };
  }

  const existing = await prisma.user.findUnique({
    where: { id: uid },
    select: { disabled: true, mustChangePassword: true, authProvider: true },
  });

  if (existing?.disabled) {
    return {
      error: "This account has been disabled. Contact Student Government.",
    };
  }

  await prisma.user.upsert({
    where: { id: uid },
    update: {
      email,
      name: name || email.split("@")[0] || "User",
    },
    create: {
      id: uid,
      email,
      name: name || email.split("@")[0] || "User",
      // Only Google accounts self-provision; password accounts always have a
      // row created for them at issuance time.
      authProvider: "google",
    },
  });

  await refreshCookiesWithIdToken(
    idToken,
    await headers(),
    await cookies(),
    authConfig,
  );

  // A freshly issued or regenerated password is temporary — send the holder
  // straight to the page that makes them pick their own.
  redirect(existing?.mustChangePassword ? "/onboarding" : "/");
}
