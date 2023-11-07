import { sui } from "@/lib/hooks/sui";
import {
  FACEBOOK_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  IS_FACEBOOK_ENABLED,
  IS_GOOGLE_ENABLED,
  IS_TWITCH_ENABLED,
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

export default withNewZkLoginSession(
  () => relativeToCurrentEpoch(sui),
  ({ session }) => {
    const router = useRouter();
    const redirectTo = first(router.query.redirectTo);
    const callbackBaseUrl = new URL("auth/", window.location.origin);

    // Render sign-in options based on what's configured.
    return (
      <>
        {IS_GOOGLE_ENABLED && (
          <div>
            <button
              onClick={() => {
                router.replace(
                  getGoogleAuthUrl(
                    session,
                    GOOGLE_CLIENT_ID,
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
        {IS_FACEBOOK_ENABLED && (
          <div>
            <button
              onClick={() => {
                router.replace(
                  getFacebookAuthUrl(
                    session,
                    FACEBOOK_CLIENT_ID,
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
        {IS_TWITCH_ENABLED && (
          <div>
            <button
              onClick={() => {
                router.replace(
                  getTwitchAuthUrl(
                    session,
                    TWITCH_CLIENT_ID,
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
