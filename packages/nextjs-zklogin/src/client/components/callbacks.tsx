/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRouter } from "next/router.js";
import * as React from "react";
import { FunctionComponent, useEffect, useState } from "react";
import { OidProvider } from "../../user.js";
import { throwExpression } from "../../utils.js";
import { useLogin } from "../hooks/api.js";
import { useZkLoginLocalSession } from "../hooks/session.js";

export type CallbackStatus = "loading" | "loggingIn" | "redirecting" | "error";

interface State {
  nonce: string;
  redirectTo: string;
}

/**
 * React HOC for implementing the callback page for a supported OpenID provider.
 *
 * After a successful sign-in, the page will automatically issue a login request to your backend
 * (default at `/api/auth/login`), and redirect the user to the original page they were trying to
 * access.
 *
 * The URL to the OpenID provider auth page MUST be obtained from one of these functions because of
 * special state encoding:
 * - `getGoogleAuthUrl`
 * - `getFacebookAuthUrl`
 * - `getTwitchAuthUrl`
 *
 * @param Component You actual React component to be rendered.
 * @param oidProvider The OpenID provider name.
 * @param keyClaimName The claim name that identifies a user. When unsure, use "sub".
 * @param getState Function to decode state param.
 * @param getJwt Function to extract JWT from params.
 * @returns Wrapped component.
 */
function withOpenIdCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>,
  oidProvider: OidProvider,
  keyClaimName: string,
  getState: (params: URLSearchParams) => State,
  getJwt: (params: URLSearchParams) => string
) {
  const WrappedComponent: FunctionComponent<P> = (props) => {
    const [status, setStatus] = useState<CallbackStatus>("loading");
    const { isReady, asPath, replace } = useRouter();
    const {
      data: session,
      isLoading: isLoadingSession,
      error: sessionError,
    } = useZkLoginLocalSession();
    const { mutateAsync: login } = useLogin();

    useEffect(() => {
      (async function () {
        setStatus("loading");

        try {
          if (!isReady || isLoadingSession) return;

          if (sessionError) throw sessionError;
          if (!session) throw new Error("Missing zkLogin session");

          const i = asPath.indexOf("#");
          if (i < 0) throw new Error("Missing params from callback");

          const params = new URLSearchParams(asPath.substring(i + 1));
          const state = getState(params);
          if (state.nonce !== session.nonce) throw new Error("Bad nonce");
          const jwt = getJwt(params);

          setStatus("loggingIn");
          await login({
            oidProvider,
            jwt,
            extendedEphemeralPublicKey: session.ephemeralKeyPair
              .getPublicKey()
              .toSuiPublicKey(),
            maxEpoch: session.maxEpoch,
            jwtRandomness: session.jwtRandomness,
            keyClaimName,
          });

          setStatus("redirecting");
          replace(state.redirectTo);
        } catch (e) {
          setStatus("error");
          throw e;
        }
      })();
    }, [asPath, isLoadingSession, isReady, login, replace, session]);

    return <Component status={status} {...props} />;
  };
  WrappedComponent.displayName = `WithOpenIdCallback<${Component.displayName}>`;
  return WrappedComponent;
}

/**
 * React HOC for implementing Google auth callback page.
 */
export function withGoogleCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>,
  keyClaimName: string = "sub"
) {
  return withOpenIdCallback(
    Component,
    "google",
    keyClaimName,
    (params) => {
      const state = new URLSearchParams(
        params.get("state") ??
          throwExpression(new Error("Missing state from params"))
      );
      return {
        nonce:
          state.get("nonce") ??
          throwExpression(new Error("Missing nonce from state")),
        redirectTo:
          state.get("redirectTo") ??
          throwExpression(new Error("Missing redirectTo from state")),
      };
    },
    (params) =>
      params.get("id_token") ??
      throwExpression(new Error("Missing id_token from params"))
  );
}

/**
 * React HOC for implementing Facebook auth callback page.
 */
export function withFacebookCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>,
  keyClaimName: string = "sub"
) {
  return withOpenIdCallback(
    Component,
    "facebook",
    keyClaimName,
    (params) => {
      const state = new URLSearchParams(
        params.get("state") ??
          throwExpression(new Error("Missing state from params"))
      );
      return {
        nonce:
          state.get("nonce") ??
          throwExpression(new Error("Missing nonce from state")),
        redirectTo:
          state.get("redirectTo") ??
          throwExpression(new Error("Missing redirectTo from state")),
      };
    },
    (params) =>
      params.get("id_token") ??
      throwExpression(new Error("Missing id_token from params"))
  );
}

/**
 * React HOC for implementing Twitch auth callback page.
 */
export function withTwitchCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>,
  keyClaimName: string = "sub"
) {
  return withOpenIdCallback(
    Component,
    "twitch",
    keyClaimName,
    (params) => {
      const state = new URLSearchParams(
        // Twitch does a second URL encoding on state when calling back.
        decodeURIComponent(
          params.get("state") ??
            throwExpression(new Error("Missing state from params"))
        )
      );
      return {
        nonce:
          state.get("nonce") ??
          throwExpression(new Error("Missing nonce from state")),
        redirectTo:
          state.get("redirectTo") ??
          throwExpression(new Error("Missing redirectTo from state")),
      };
    },
    (params) =>
      params.get("id_token") ??
      throwExpression(new Error("Missing id_token from params"))
  );
}
