import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/app/config/server-config";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Set your password",
};

/**
 * Forced password change for accounts issued by a superadmin. The root layout
 * pushes holders here after sign-in; this page turns them away once there is
 * nothing left to do, so a stale link cannot strand anyone on it.
 */
export default async function OnboardingPage() {
  const tokens = await getTokens(await cookies(), authConfig);
  if (!tokens?.decodedToken.uid) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: tokens.decodedToken.uid },
    select: { email: true, authProvider: true, mustChangePassword: true },
  });

  if (!user || user.authProvider !== "password" || !user.mustChangePassword) {
    redirect("/");
  }

  return <OnboardingClient email={user.email} />;
}
