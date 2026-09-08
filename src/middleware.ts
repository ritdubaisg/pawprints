import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  authMiddleware,
  redirectToLogin,
  redirectToHome,
} from "next-firebase-auth-edge";
import { TokenSet } from "next-firebase-auth-edge/auth";
import { authConfig, serverConfig } from "./app/config/server-config";

const PUBLIC_PATHS = ["/login"];
const PRIVATE_PATHS = ["/profile", "/create", "/review", "/onboarding"];

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    loginPath: "/api/login",
    logoutPath: "/api/logout",
    refreshTokenPath: "/api/refresh-token",
    apiKey: authConfig.apiKey,
    cookieName: authConfig.cookieName,
    cookieSignatureKeys: authConfig.cookieSignatureKeys,
    cookieSerializeOptions: authConfig.cookieSerializeOptions,
    serviceAccount: serverConfig.serviceAccount,
    handleValidToken: async ({ token, decodedToken }, headers) => {
      // Authenticated user should not be able to access /login, /register and /reset-password routes
      if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
        return redirectToHome(request);
      }

      // The root layout gates accounts still on a temporary password, and a
      // layout cannot see the current route. Middleware runs on the edge and
      // cannot reach Prisma, so it forwards the path instead.
      headers.set("x-pathname", request.nextUrl.pathname);

      return NextResponse.next({
        request: {
          headers,
        },
      });
    },
    handleInvalidToken: async (reason) => {
      console.info("Missing or malformed credentials", { reason });

      return redirectToLogin(request, {
        path: "/login",
        privatePaths: PRIVATE_PATHS,
      });
    },
    handleError: async (error) => {
      console.error("Unhandled authentication error", { error });

      return redirectToLogin(request, {
        path: "/login",
        privatePaths: PRIVATE_PATHS,
      });
    },
    getMetadata: async (tokens: TokenSet) => {
      // Here you can load any data related to the user
      // The data will be saved in cookies and can be accessed using `getTokens` function.
      // Note: The cookie size is limited, so keep the data compact
      return {
        uid: tokens.decodedIdToken.uid,
        timestamp: new Date().getTime(),
      };
    },
    enableTokenRefreshOnExpiredKidHeader: true,
  });
}

export const config = {
  matcher: [
    "/api/login",
    "/api/logout",
    "/",
    "/((?!_next|favicon.ico|api|.*\\.).*)",
  ],
};
