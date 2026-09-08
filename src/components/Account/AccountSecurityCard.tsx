"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, Info } from "lucide-react";
import moment from "moment";
import {
  getAccountSecurityInfo,
  type AccountSecurityInfo,
} from "@/app/account-actions";
import ChangePasswordForm from "./ChangePasswordForm";

/**
 * Password management for the signed-in user. Google accounts see an
 * explanation instead of a form — their credentials live with Google, and
 * offering a password field here would be a dead end.
 */
export function AccountSecurityCard() {
  const [info, setInfo] = useState<AccountSecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccountSecurityInfo()
      .then(setInfo)
      .catch((error) => console.error("Failed to load account info", error))
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    getAccountSecurityInfo()
      .then(setInfo)
      .catch(() => {});
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!info) return null;

  const isGoogle = info.authProvider !== "password";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Sign-in &amp; security</CardTitle>
          <Badge variant={isGoogle ? "secondary" : "outline"}>
            {isGoogle ? "Google account" : "Password account"}
          </Badge>
        </div>
        <CardDescription>{info.email}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isGoogle ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You sign in with your RIT Google account, so PawPrints never
              holds a password for you. Change it through your Google account
              settings.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {info.mustChangePassword ? (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  You are still using a temporary password issued by Student
                  Government. Choose your own below.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                {info.passwordUpdatedAt
                  ? `Password last changed ${moment(info.passwordUpdatedAt).format("MMMM D, YYYY")}.`
                  : "You have not changed your password yet."}
              </p>
            )}

            <Separator />

            <ChangePasswordForm variant="settings" onSuccess={refresh} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AccountSecurityCard;
