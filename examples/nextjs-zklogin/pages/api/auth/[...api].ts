import { sui, zkp, zkw } from "@/lib/api/shinami";
import {
  FACEBOOK_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  IS_FACEBOOK_ENABLED,
  IS_GOOGLE_ENABLED,
  IS_TWITCH_ENABLED,
  TWITCH_CLIENT_ID,
} from "@/lib/shared/openid";
import { authHandler } from "@shinami/nextjs-zklogin/server/pages";

// This handler should be installed at route "/api/auth/[...api]".
// If you need to use a different path, set env NEXT_PUBLIC_AUTH_API_BASE to override the default.
export default authHandler(
  sui, // Alternatively, you can use mystenSui
  zkw, // Alternatively, you can use mystenSaltProvider
  zkp, // Alternatively, you can use mystenProver
  (provider) => {
    switch (provider) {
      case "google":
        return IS_GOOGLE_ENABLED;
      case "facebook":
        return IS_FACEBOOK_ENABLED;
      case "twitch":
        return IS_TWITCH_ENABLED;
    }
  },
  (provider, user) => {
    // You can implement custom authorization logic here.
    // Return undefined to deny this user's login attempt.
    if (
      (provider === "google" && user.aud === GOOGLE_CLIENT_ID) ||
      (provider === "facebook" && user.aud === FACEBOOK_CLIENT_ID) ||
      (provider === "twitch" && user.aud === TWITCH_CLIENT_ID)
    )
      // Can also return custom auth context here which would be usable by your frontend pages and
      // API routes.
      return {};
  }
);
