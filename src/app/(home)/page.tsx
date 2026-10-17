import React, { Suspense } from "react";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { authConfig } from "@/app/config/server-config";
import { getPetitions } from "@/app/actions";
import PublicHome from "@/components/Home/PublicHome";
import LoggedInHome from "@/components/Home/LoggedInHome";
import { buildHomeSections } from "@/lib/petition-sections";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default async function Home() {
  const tokens = await getTokens(await cookies(), authConfig);

  if (!tokens) {
    return <PublicHome />;
  }

  const sections = buildHomeSections(await getPetitions());

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoggedInHome sections={sections} />
    </Suspense>
  );
}
