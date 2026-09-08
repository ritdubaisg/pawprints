"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound } from "lucide-react";
import ChangePasswordForm from "@/components/Account/ChangePasswordForm";

export default function OnboardingClient({ email }: { email: string }) {
  const router = useRouter();

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Set your <span className="text-[#F76902]">PawPrints</span> password
          </CardTitle>
          <CardDescription>
            Signed in as {email}. Before you continue, replace the temporary
            password you were given with one only you know.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertDescription>
              Your temporary password stops working as soon as you finish here.
            </AlertDescription>
          </Alert>

          <ChangePasswordForm
            variant="onboarding"
            submitLabel="Set password and continue"
            onSuccess={() => {
              router.replace("/");
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
