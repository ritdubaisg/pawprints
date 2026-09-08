"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { getFirebaseAuth } from "@/app/auth/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/app/account-actions";
import { ALLOWED_EMAIL_DESCRIPTION } from "@/lib/email-domain";
import type { LoginResult } from "./login";

interface LoginPageProps {
  loginAction: (idToken: string) => Promise<LoginResult | void>;
}

type View = "options" | "email" | "forgot";

export default function LoginPage({ loginAction }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [view, setView] = useState<View>("options");

  /**
   * `loginAction` rejects anyone outside RIT after Firebase has already
   * signed them in. Clearing the client session keeps the two in step, so a
   * rejected account cannot linger and be retried silently.
   */
  const handleLoginResult = async (result: LoginResult | void) => {
    if (result?.error) {
      await signOut(getFirebaseAuth()).catch(() => {});
      setError(result.error);
      setIsLoading(false);
      return true;
    }
    return false;
  };

  const goTo = (next: View) => {
    setError(null);
    setNotice(null);
    setView(next);
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          setIsLoading(true);
          const user = result.user;
          const idToken = await user?.getIdToken();
          await handleLoginResult(await loginAction(idToken!));
        }
      })
      .catch((error) => {
        if (error?.message === "NEXT_REDIRECT") {
          return;
        }
        console.error("Redirect login error:", error);
        setError(error.message || "An error occurred during login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginAction]);

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const idToken = await user.getIdToken();
      if (await handleLoginResult(await loginAction(idToken))) return;
    } catch (error: any) {
      if (error?.message === "NEXT_REDIRECT") {
        return;
      }
      console.error("Login error:", error);
      setError(
        error?.code === "auth/user-disabled"
          ? "This account has been disabled. Contact Student Government."
          : "Invalid email or password",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      const result = await requestPasswordReset(resetEmail);
      if (result.ok) {
        setNotice(result.message);
      } else {
        setError(result.message);
      }
    } catch {
      setError("Could not send a reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();

      // Configure Google Auth provider
      provider.setCustomParameters({
        prompt: "select_account",
      });

      // Note: its either this or signInWithRedirect
      // signInWithPopup has issues with some browsers, especially on mobile
      // But signInWithRedirect requires additional handling after redirect
      // especially on storage partitioned browsers
      let idToken: string;
      try {
        const result = await signInWithPopup(auth, provider);
        idToken = await result.user.getIdToken();
      } catch (popupError: any) {
        console.log("Popup failed, trying redirect", popupError);

        // THIS WILL FAIL IN DEV ON LOCALHOST
        // USE SIGNINWITHPOPUP FOR DEV, SIGNINWITHREDIRECT WILL WORK IN PROD
        await signInWithRedirect(auth, provider);
        return;
      }

      if (await handleLoginResult(await loginAction(idToken))) return;
    } catch (error: any) {
      if (error?.message === "NEXT_REDIRECT") {
        // Ignore, this is expected for Next.js redirects
        return;
      } else {
        console.error("Login error:", error);
        setError(error.message || "An error occurred during login");
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23f76902' fill-opacity='0.15'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <Card className="w-full max-w-sm shadow-lg relative z-10">
        <CardHeader className="space-y-4 flex flex-col items-center text-center pb-2">
          <div className="hidden relative w-24 h-16">
            <Image
              src="/RIT-00070A_RGB_TM.svg"
              alt="RIT Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-left text-5xl font-bold">
              Sign in to <span className="text-[#F76902]">PawPrints</span>
            </CardTitle>
            <CardDescription className="text-left mt-2 font-bold">
              Your voice matters at RIT Dubai
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {notice && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}

          {view === "options" && (
            <div className="space-y-4">
              <div className="space-y-4">
                <Label className="text-left w-full text-xs text-muted-foreground">
                  Sign in with your RIT Google account to continue, <br />
                  or sign in with your provided email (for faculty)
                </Label>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium relative"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Login with Google
                </Button>
              </div>
              <div>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium relative"
                  onClick={() => goTo("email")}
                  disabled={isLoading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Login with Email
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Only {ALLOWED_EMAIL_DESCRIPTION} accounts can use PawPrints.
              </p>
            </div>
          )}

          {view === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="flex mb-2">
                <Button
                  type="button"
                  variant="link"
                  className="!p-0 mb-4 h-auto hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => goTo("options")}
                >
                  <ArrowLeft />
                  Back to sign in options
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@rit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setResetEmail(email);
                  goTo("forgot");
                }}
              >
                Forgot your password?
              </Button>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="flex mb-2">
                <Button
                  type="button"
                  variant="link"
                  className="!p-0 mb-4 h-auto hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => goTo("email")}
                >
                  <ArrowLeft />
                  Back to sign in
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@rit.edu"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll email a link to set a new password. Google accounts
                  are managed by RIT and cannot be reset here.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}

          <div className="text-sm text-semibold text-muted-foreground text-center space-y-4 pt-4">
            <p>
              By signing in, you agree to use PawPrints responsibly. You also
              agree to the{" "}
              <a
                href="https://www.rit.edu/academicaffairs/policiesmanual/c082"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                RIT Code of Conduct for Computer and Network Use
              </a>
              .
            </p>

            <Separator className="my-4 mt-12" />

            <p className="text-xs text-gray-400">
              This site is protected by reCAPTCHA and the Google{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600"
              >
                Terms of Service
              </a>{" "}
              apply.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
