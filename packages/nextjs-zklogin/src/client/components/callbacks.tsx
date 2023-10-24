/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRouter } from "next/router.js";
import React, { FunctionComponent, useEffect, useState } from "react";
import { OidProvider } from "../../user.js";
import { throwExpression } from "../../utils.js";
import { useLogin } from "../hooks/api.js";
import { useZkLoginLocalSession } from "../hooks/session.js";

export type CallbackStatus = "loading" | "loggingIn" | "redirecting" | "error";

interface State {
  nonce: string;
  redirectTo: string;
}

function withOpenIdCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>,
  oidProvider: OidProvider,
  getState: (params: URLSearchParams) => State,
  getJwt: (params: URLSearchParams) => string
) {
  const WrappedComponent: FunctionComponent<P> = (props) => {
    const [status, setStatus] = useState<CallbackStatus>("loading");
    const { isReady, asPath, replace } = useRouter();
    const { data: session, isLoading: isLoadingSession } =
      useZkLoginLocalSession();
    const { mutateAsync: login } = useLogin();

    useEffect(() => {
      (async function () {
        setStatus("loading");

        try {
          if (!isReady || isLoadingSession) return;

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
            publicKey: session.keyPair.getPublicKey().toBase64(),
            maxEpoch: session.maxEpoch,
            randomness: session.randomness,
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

export function withGoogleCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>
) {
  return withOpenIdCallback(
    Component,
    "google",
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

export function withFacebookCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>
) {
  return withOpenIdCallback(
    Component,
    "facebook",
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

export function withTwitchCallback<P>(
  Component: FunctionComponent<P & { status: CallbackStatus }>
) {
  return withOpenIdCallback(
    Component,
    "twitch",
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
