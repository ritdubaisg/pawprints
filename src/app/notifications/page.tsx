import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/app/config/server-config";
import { NotificationsList } from "@/components/Notifications/NotificationsList";

export const metadata = {
  title: "Notifications",
};

/**
 * The full history, as opposed to the bell's most-recent handful. Gated
 * server-side so a signed-out visitor never reaches the client fetch.
 */
export default async function NotificationsPage() {
  const tokens = await getTokens(await cookies(), authConfig);
  if (!tokens?.decodedToken.uid) {
    redirect("/login");
  }

  return <NotificationsList />;
}
