"use client";

import React, { useEffect, useState, Suspense } from "react";
import { getUserProfile } from "@/app/actions";
import { Petition } from "@/types/petition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PetitionGrid } from "@/components";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2, UserIcon, CalendarIcon } from "lucide-react";
import { NotificationSettings } from "@/components/Notifications/NotificationSettings";
import { AccountSecurityCard } from "@/components/Account/AccountSecurityCard";

interface UserProfile {
  user: {
    name: string | null;
    email: string;
    createdAt: string;
  };
  createdPetitions: Petition[];
  signedPetitions: Petition[];
}

function ProfileContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") ?? "created";

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getUserProfile();
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    // Redirect /profile/settings to /profile?tab=settings
    if (pathname.endsWith("/profile/settings")) {
      router.replace("/profile?tab=settings");
    }
  }, [pathname, router]);

  const handlePetitionClick = (petition: Petition) => {
    router.push(`/petitions/${petition.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">
          Please log in to view your profile
        </h2>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <Card className="w-full md:w-80 shrink-0 border-none shadow-sm bg-muted/30">
          <CardHeader className="flex flex-col items-center text-center pb-2">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.user.name || profile.user.email}`}
              />
              <AvatarFallback>
                <UserIcon className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">
              {profile.user.name || "Anonymous"}
            </CardTitle>
            <CardDescription className="text-xs truncate w-full px-4">
              {profile.user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                Joined {new Date(profile.user.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {profile.createdPetitions.length}
                </div>
                <div className="text-xs text-muted-foreground uppercase">
                  Created
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {profile.signedPetitions.length}
                </div>
                <div className="text-xs text-muted-foreground uppercase">
                  Signed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 w-full min-w-0">
          <Tabs defaultValue={activeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="created">Created Petitions</TabsTrigger>
              <TabsTrigger value="signed">Signed Petitions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="created" className="mt-0">
              {profile.createdPetitions.length > 0 ? (
                <PetitionGrid
                  petitions={profile.createdPetitions}
                  onPetitionClick={handlePetitionClick}
                  columns={2}
                  showStatus={true}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  You haven't created any petitions yet.
                </div>
              )}
            </TabsContent>

            <TabsContent value="signed" className="mt-0">
              {profile.signedPetitions.length > 0 ? (
                <PetitionGrid
                  petitions={profile.signedPetitions}
                  onPetitionClick={handlePetitionClick}
                  columns={2}
                  showStatus={true}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  You haven't signed any petitions yet.
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-6">
              <NotificationSettings />
              <AccountSecurityCard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
