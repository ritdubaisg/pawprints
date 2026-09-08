"use server";

/**
 * Account issuance and password management.
 *
 * Students reach PawPrints through Google (`@g.rit.edu`). Faculty and staff
 * have no Google identity, so a superadmin issues them a password account
 * here: the account is created in Firebase Auth with a generated temporary
 * password, and the holder is forced to choose their own on first sign-in.
 *
 * Everything in this file that mutates another user's account is superadmin
 * only. `checkPermission` from actions.ts is deliberately not reused — it
 * grants on any matching staff bit, and no staff permission should confer the
 * ability to mint credentials.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig, serverConfig } from "./config/server-config";
import { prisma } from "@/lib/prisma";
import { getAdminAuth } from "@/lib/firebase-admin";
import { logAction } from "@/lib/audit";
import { generateTempPassword, validatePassword } from "@/lib/password";
import {
  ALLOWED_EMAIL_DESCRIPTION,
  isAllowedEmail,
  normalizeEmail,
} from "@/lib/email-domain";
import { PERMISSIONS } from "@/lib/permissions";

const ALL_PERMISSIONS = Object.values(PERMISSIONS).reduce(
  (acc, value) => acc | value,
  0,
);

async function requireSuperAdmin() {
  const tokens = await getTokens(await cookies(), authConfig);
  if (!tokens) throw new Error("Unauthorized");

  const userId = tokens.decodedToken.uid;
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    throw new Error("Unauthorized: Superadmin access required");
  }

  return userId;
}

async function requireSignedIn() {
  const tokens = await getTokens(await cookies(), authConfig);
  if (!tokens?.decodedToken.uid) throw new Error("Unauthorized");
  return tokens.decodedToken.uid;
}

/**
 * Confirms a password before a destructive change to the same account.
 *
 * The Firebase client SDK's `reauthenticateWithCredential` is unusable here:
 * the app keeps auth state in memory only and relies on the server cookie, so
 * `auth.currentUser` is null on any page the user navigated to. Checking the
 * password against the Identity Toolkit REST endpoint works from the server
 * regardless of client state.
 */
async function verifyPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const apiKey = serverConfig.firebaseApiKey;
  if (!apiKey) throw new Error("Password sign-in is not configured");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    },
  );

  return response.ok;
}

/**
 * Asks Firebase to email a password-reset link.
 *
 * The Admin SDK can only mint a link, never deliver one. This is the endpoint
 * the client SDK's `sendPasswordResetEmail` calls, so delivery is Firebase's
 * own — no mail server of ours involved. Free-tier sending limits are well
 * above what account issuance needs.
 *
 * Returns false rather than throwing: callers have usually already committed
 * to something (a created account) and need to report a partial success.
 */
async function sendResetEmail(email: string): Promise<boolean> {
  const apiKey = serverConfig.firebaseApiKey;
  if (!apiKey) return false;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
      },
    );
    return response.ok;
  } catch (error) {
    console.error("Failed to send password reset email", error);
    return false;
  }
}

/** How a newly issued account receives its first password. */
export type AccountDelivery = "email" | "password";

export interface IssuedCredentials {
  email: string;
  /** Only set when the superadmin chose to hand the password over directly. */
  password: string | null;
  delivery: AccountDelivery;
  emailSent: boolean;
}

/**
 * Creates a password account for someone who cannot sign in with Google.
 *
 * Two ways to deliver the first password, and they are mutually exclusive:
 *
 * - "email": Firebase emails a reset link and the holder picks their own
 *   password. The generated one is never revealed to anyone, and no forced
 *   change is queued — the link *is* the password-setting step.
 * - "password": the generated password is returned once for the superadmin to
 *   hand over directly, and the holder is forced to replace it at first
 *   sign-in. The fallback when email cannot be relied on.
 *
 * The password is never stored or logged — Firebase keeps only its hash, and
 * a superadmin who loses it regenerates instead.
 */
export async function createManagedAccount(input: {
  email: string;
  name: string;
  isStaff?: boolean;
  permissions?: number;
  delivery?: AccountDelivery;
}): Promise<IssuedCredentials> {
  const actorId = await requireSuperAdmin();

  const email = normalizeEmail(input.email ?? "");
  const name = (input.name ?? "").trim();

  if (!email) throw new Error("Email is required");
  if (!isAllowedEmail(email)) {
    throw new Error(`Email must be an ${ALLOWED_EMAIL_DESCRIPTION} address`);
  }
  if (!name) throw new Error("Name is required");
  if (name.length > 100) throw new Error("Name must be 100 characters or fewer");

  const isStaff = !!input.isStaff;
  const permissions = input.permissions ?? 0;

  if (!Number.isInteger(permissions) || permissions < 0) {
    throw new Error("Invalid permissions value");
  }
  if ((permissions & ~ALL_PERMISSIONS) !== 0) {
    throw new Error("Invalid permissions value: unknown permission bits");
  }
  // Mirrors updateUserPermissions: bits without staff are a no-op, so refuse
  // rather than store something that silently does nothing.
  if (permissions > 0 && !isStaff) {
    throw new Error("Grant staff access before assigning permissions");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account already exists for this email");
  }

  const adminAuth = getAdminAuth();

  // The Firebase project may already know this address even when our database
  // does not — an abandoned account, or a Google sign-in that never completed.
  try {
    await adminAuth.getUserByEmail(email);
    throw new Error(
      "This email already exists in Firebase Auth and cannot be issued again",
    );
  } catch (error: any) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  const delivery: AccountDelivery = input.delivery ?? "email";
  const password = generateTempPassword();

  const created = await adminAuth.createUser({
    email,
    password,
    displayName: name,
    // Issued by a superadmin who has already confirmed the recipient, and
    // there is no self-service path to verify it.
    emailVerified: true,
  });

  try {
    await prisma.user.create({
      data: {
        id: created.uid,
        email,
        name,
        isStaff,
        permissions,
        authProvider: "password",
        // Only the hand-over path leaves a password someone else has seen, so
        // only it needs the forced change at first sign-in.
        mustChangePassword: delivery === "password",
        issuedById: actorId,
      },
    });
  } catch (error) {
    // Without this the Firebase account would linger with no database row,
    // and the address could never be issued again.
    await adminAuth.deleteUser(created.uid).catch(() => {});
    throw error;
  }

  const emailSent = delivery === "email" ? await sendResetEmail(email) : false;

  await logAction(
    "ISSUE_ACCOUNT",
    {
      targetUserId: created.uid,
      targetEmail: email,
      isStaff,
      permissions,
      delivery,
      emailSent,
    },
    actorId,
  );

  revalidatePath("/admin");

  return {
    email,
    password: delivery === "password" ? password : null,
    delivery,
    emailSent,
  };
}

/**
 * Emails the holder a reset link so they can choose a password without anyone
 * relaying a secret. The existing password keeps working until they use it,
 * which is what makes this safe to send speculatively.
 */
export async function sendAccountPasswordResetEmail(targetUserId: string) {
  const actorId = await requireSuperAdmin();

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true, authProvider: true, disabled: true },
  });
  if (!target) throw new Error("User not found");
  if (target.authProvider !== "password") {
    throw new Error("This account signs in with Google and has no password");
  }
  if (target.disabled) {
    throw new Error("Enable the account before sending a reset link");
  }

  const sent = await sendResetEmail(target.email);
  if (!sent) {
    throw new Error(
      "Firebase would not send the email. Copy a reset link instead.",
    );
  }

  await logAction(
    "SEND_PASSWORD_RESET_EMAIL",
    { targetUserId, targetEmail: target.email },
    actorId,
  );

  return { email: target.email };
}

/**
 * Issues a fresh temporary password, invalidating the old one and every
 * active session for that account.
 */
export async function regenerateAccountPassword(
  targetUserId: string,
): Promise<IssuedCredentials> {
  const actorId = await requireSuperAdmin();

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true, authProvider: true },
  });
  if (!target) throw new Error("User not found");
  if (target.authProvider !== "password") {
    throw new Error("This account signs in with Google and has no password");
  }

  const password = generateTempPassword();
  const adminAuth = getAdminAuth();

  await adminAuth.updateUser(targetUserId, { password });
  // Anyone holding the previous password — or a live session opened with it —
  // loses access at the next token refresh.
  await adminAuth.revokeRefreshTokens(targetUserId);

  await prisma.user.update({
    where: { id: targetUserId },
    data: { mustChangePassword: true, passwordUpdatedAt: null },
  });

  await logAction(
    "REGENERATE_PASSWORD",
    { targetUserId, targetEmail: target.email },
    actorId,
  );

  revalidatePath("/admin");

  return {
    email: target.email,
    password,
    delivery: "password" as const,
    emailSent: false,
  };
}

/**
 * A single-use Firebase reset link the superadmin can hand over directly.
 * Useful while outbound email is still unconfigured, and for holders who
 * would rather set their own password than be given one.
 */
export async function createPasswordResetLink(
  targetUserId: string,
): Promise<string> {
  const actorId = await requireSuperAdmin();

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true, authProvider: true },
  });
  if (!target) throw new Error("User not found");
  if (target.authProvider !== "password") {
    throw new Error("This account signs in with Google and has no password");
  }

  const link = await getAdminAuth().generatePasswordResetLink(target.email);

  // The link is a credential; only the fact that one was minted is recorded.
  await logAction(
    "CREATE_PASSWORD_RESET_LINK",
    { targetUserId, targetEmail: target.email },
    actorId,
  );

  return link;
}

/**
 * Suspends or restores sign-in. Accounts are never deleted — petitions,
 * signatures and audit entries reference them.
 */
export async function setAccountDisabled(
  targetUserId: string,
  disabled: boolean,
) {
  const actorId = await requireSuperAdmin();

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true, isSuperAdmin: true, disabled: true },
  });
  if (!target) throw new Error("User not found");

  if (disabled) {
    if (targetUserId === actorId) {
      throw new Error("You cannot disable your own account");
    }
    if (target.isSuperAdmin) {
      const activeSuperAdmins = await prisma.user.count({
        where: { isSuperAdmin: true, disabled: false },
      });
      if (activeSuperAdmins <= 1) {
        throw new Error("Cannot disable the last active superadmin");
      }
    }
  }

  const adminAuth = getAdminAuth();
  await adminAuth.updateUser(targetUserId, { disabled });
  if (disabled) {
    // Otherwise an already-issued session keeps working until it expires.
    await adminAuth.revokeRefreshTokens(targetUserId);
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { disabled },
  });

  await logAction(
    disabled ? "DISABLE_ACCOUNT" : "ENABLE_ACCOUNT",
    { targetUserId, targetEmail: target.email },
    actorId,
  );

  revalidatePath("/admin");
}

export interface AccountSecurityInfo {
  email: string;
  authProvider: string;
  mustChangePassword: boolean;
  passwordUpdatedAt: string | null;
}

/** Drives the security card in profile settings and the onboarding page. */
export async function getAccountSecurityInfo(): Promise<AccountSecurityInfo | null> {
  const userId = await requireSignedIn();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      authProvider: true,
      mustChangePassword: true,
      passwordUpdatedAt: true,
    },
  });
  if (!user) return null;

  return {
    email: user.email,
    authProvider: user.authProvider,
    mustChangePassword: user.mustChangePassword,
    passwordUpdatedAt: user.passwordUpdatedAt?.toISOString() ?? null,
  };
}

/**
 * Self-service password change, used both during onboarding and afterwards.
 * The current password is required in both cases: during onboarding it proves
 * the person at the keyboard is the one the credentials were handed to.
 */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
) {
  const userId = await requireSignedIn();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, authProvider: true },
  });
  if (!user) throw new Error("User not found");
  if (user.authProvider !== "password") {
    throw new Error(
      "Your account signs in with Google. Manage your password in your Google account.",
    );
  }

  const invalid = validatePassword(newPassword);
  if (invalid) throw new Error(invalid);

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from the current one");
  }

  if (!(await verifyPassword(user.email, currentPassword))) {
    throw new Error("Current password is incorrect");
  }

  await getAdminAuth().updateUser(userId, { password: newPassword });

  await prisma.user.update({
    where: { id: userId },
    data: { mustChangePassword: false, passwordUpdatedAt: new Date() },
  });

  await logAction("CHANGE_OWN_PASSWORD", { targetEmail: user.email }, userId);

  revalidatePath("/profile");

  return { success: true };
}

/**
 * "Forgot password" from the sign-in screen.
 *
 * Always resolves the same way regardless of whether the address exists, so
 * the form cannot be used to enumerate accounts. Google accounts are skipped
 * silently — they have no password to reset.
 */
export async function requestPasswordReset(email: string) {
  const normalized = normalizeEmail(email ?? "");

  if (!isAllowedEmail(normalized)) {
    return {
      message: `Enter your ${ALLOWED_EMAIL_DESCRIPTION} address.`,
      ok: false,
    };
  }

  const generic = {
    ok: true,
    message:
      "If a password account exists for that address, a reset link is on its way.",
  };

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { authProvider: true, disabled: true },
  });

  if (!user || user.authProvider !== "password" || user.disabled) {
    return generic;
  }

  await sendResetEmail(normalized);

  return generic;
}
