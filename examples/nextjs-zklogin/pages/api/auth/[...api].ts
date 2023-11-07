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
    // You can implement custom authorization logic.
    // Return undefined to deny this user's login attempt.
    if (
      (provider === "google" && user.aud === GOOGLE_CLIENT_ID) ||
      (provider === "facebook" && user.aud === FACEBOOK_CLIENT_ID) ||
      (provider === "twitch" && user.aud === TWITCH_CLIENT_ID)
    )
      return {}; // Can also return custom auth context here.
  }
);
