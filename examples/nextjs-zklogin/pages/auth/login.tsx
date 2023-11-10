import { sui } from "@/lib/hooks/sui";
import {
  FACEBOOK_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  TWITCH_CLIENT_ID,
} from "@/lib/shared/openid";
import { first } from "@/lib/shared/utils";
import {
  getFacebookAuthUrl,
  getGoogleAuthUrl,
  getTwitchAuthUrl,
  relativeToCurrentEpoch,
  withNewZkLoginSession,
} from "@shinami/nextjs-zklogin/client";
import { useRouter } from "next/router";

// This page should be installed at route "/auth/login".
// If you need to use a different path, set env NEXT_PUBLIC_LOGIN_PAGE_PATH to override the default,
// and update "callbackBaseUrl" accordingly.
export default withNewZkLoginSession(
  () => relativeToCurrentEpoch(sui),
  ({ session }) => {
    const router = useRouter();
    const redirectTo = first(router.query.redirectTo);
    const callbackBaseUrl = new URL("auth/", window.location.origin);

    // Render sign-in options based on what's configured.
    return (
      <>
        {GOOGLE_CLIENT_ID && (
          <div>
            <button
              onClick={() => {
                router.replace(
                  getGoogleAuthUrl(
                    session,
                    GOOGLE_CLIENT_ID!,
                    new URL("google", callbackBaseUrl),
                    redirectTo
                  )
                );
              }}
            >
              Sign in with Google
            </button>
          </div>
        )}
        {FACEBOOK_CLIENT_ID && (
          <div>
            <button
              onClick={() => {
                router.replace(
                  getFacebookAuthUrl(
                    session,
                    FACEBOOK_CLIENT_ID!,
                    new URL("facebook", callbackBaseUrl),
                    redirectTo
                  )
                );
              }}
            >
              Sign in with Facebook
            </button>
          </div>
        )}
        {TWITCH_CLIENT_ID && (
          <div>
            <button
              onClick={() => {
                router.replace(
                  getTwitchAuthUrl(
                    session,
                    TWITCH_CLIENT_ID!,
                    new URL("twitch", callbackBaseUrl),
                    redirectTo
                  )
                );
              }}
            >
              Sign in with Twitch
            </button>
          </div>
        )}
      </>
    );
  }
);
