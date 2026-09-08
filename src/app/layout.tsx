import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Header, Footer } from "@/components";
import "./globals.css";

import { getTokens } from "next-firebase-auth-edge";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/app/auth/AuthProvider";
import { authConfig } from "./config/server-config";
import { toUser } from "./shared/user";
import { Metadata } from "@/app/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { prisma } from "@/lib/prisma";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tokens = await getTokens<Metadata>(await cookies(), authConfig);
  const user = tokens ? toUser(tokens) : null;

  let hasAdminAccess = false;
  let isSuperAdmin = false;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.uid },
      select: {
        isStaff: true,
        isSuperAdmin: true,
        mustChangePassword: true,
        authProvider: true,
      },
    });
    if (dbUser) {
      hasAdminAccess = dbUser.isStaff || dbUser.isSuperAdmin;
      isSuperAdmin = dbUser.isSuperAdmin;

      // Accounts still on a superadmin-issued password get no further than
      // /onboarding. Doing this here rather than in middleware is what lets
      // the check consult the database; the path comes from the header the
      // middleware sets.
      if (dbUser.authProvider === "password" && dbUser.mustChangePassword) {
        const pathname = (await headers()).get("x-pathname") ?? "";
        const exempt =
          pathname.startsWith("/onboarding") ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/logout");
        if (!exempt) {
          redirect("/onboarding");
        }
      }
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <NextTopLoader color="var(--foreground)" showSpinner={false} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider user={user}>
            <Header
              hasAdminAccess={hasAdminAccess}
              isSuperAdmin={isSuperAdmin}
            />
            <main className="flex-1">{children}</main>
          </AuthProvider>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
