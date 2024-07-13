import { sui, zkp, zkw } from "@/lib/api/shinami";
import {
  APPLE_CLIENT_ID,
  FACEBOOK_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  TWITCH_CLIENT_ID,
} from "@/lib/shared/openid";
import { authHandler } from "@shinami/nextjs-zklogin/server/pages";

// This handler should be installed at route "/api/auth/[...api]".
// If you need to use a different path, set env NEXT_PUBLIC_AUTH_API_BASE to override the default.
export default authHandler(
  sui, // Alternatively, you can use mystenSui
  zkw, // Alternatively, you can use mystenSaltProvider
  zkp, // Alternatively, you can use mystenProver
  {
    google: GOOGLE_CLIENT_ID ? [GOOGLE_CLIENT_ID] : undefined,
    facebook: FACEBOOK_CLIENT_ID ? [FACEBOOK_CLIENT_ID] : undefined,
    twitch: TWITCH_CLIENT_ID ? [TWITCH_CLIENT_ID] : undefined,
    apple: APPLE_CLIENT_ID ? [APPLE_CLIENT_ID] : undefined,
  },
);
