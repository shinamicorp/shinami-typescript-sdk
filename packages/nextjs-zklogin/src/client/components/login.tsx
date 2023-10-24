/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient } from "@mysten/sui.js/client";
import React, { FunctionComponent, useEffect, useState } from "react";
import { useNewZkLoginSession } from "../hooks/login.js";
import { ZkLoginLocalSession } from "../hooks/session.js";

export function withNewZkLoginSession<P extends object>(
  getMaxEpoch: () => Promise<number> | number,
  Component: FunctionComponent<P & { session: ZkLoginLocalSession }>,
  Loading: FunctionComponent<P> = () => <p>Preparing zkLogin session...</p>
) {
  const WrappedComponent: FunctionComponent<P> = (props) => {
    const { mutateAsync: newSession } = useNewZkLoginSession();
    const [session, setSession] = useState<ZkLoginLocalSession>();

    useEffect(() => {
      (async () => {
        const session = await newSession({ getMaxEpoch });
        setSession(session);
      })();
    }, [newSession]);

    if (!session) return <Loading {...props} />;

    return <Component session={session} {...props} />;
  };
  WrappedComponent.displayName = `WithNewZkLoginSession<${Component.displayName}>`;
  return WrappedComponent;
}

export async function relativeToCurrentEpoch(
  sui: SuiClient,
  epochsBeyondCurrent: number = 1
): Promise<number> {
  const { epoch } = await sui.getLatestSuiSystemState();
  return Number(epoch) + epochsBeyondCurrent;
}

// https://developers.google.com/identity/openid-connect/openid-connect#sendauthrequest
export function getGoogleAuthUrl(
  session: ZkLoginLocalSession,
  clientId: string,
  callback: URL,
  redirectTo: string = "/",
  extraScopes: string[] = []
): URL {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback.toString(),
    response_type: "id_token",
    scope: ["openid", ...extraScopes].join(" "),
    nonce: session.nonce,
    state: new URLSearchParams({ redirectTo, nonce: session.nonce }).toString(),
  }).toString();

  return new URL(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

// https://developers.facebook.com/docs/facebook-login/guides/advanced/oidc-token
export function getFacebookAuthUrl(
  session: ZkLoginLocalSession,
  clientId: string,
  callback: URL,
  redirectTo: string = "/",
  extraScopes: string[] = []
): URL {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback.toString(),
    response_type: "id_token",
    scope: ["openid", ...extraScopes].join(" "),
    nonce: session.nonce,
    state: new URLSearchParams({ redirectTo, nonce: session.nonce }).toString(),
  }).toString();

  return new URL(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
}

// https://dev.twitch.tv/docs/authentication/getting-tokens-oidc/#oidc-implicit-grant-flow
export function getTwitchAuthUrl(
  session: ZkLoginLocalSession,
  clientId: string,
  callback: URL,
  redirectTo: string = "/",
  extraScopes: string[] = [],
  extraClaims: string[] = []
): URL {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback.toString(),
    response_type: "id_token",
    scope: ["openid", ...extraScopes].join(" "),
    claims: JSON.stringify({
      id_token: Object.fromEntries(extraClaims.map((x) => [x, null])),
    }),
    nonce: session.nonce,
    state: new URLSearchParams({ redirectTo, nonce: session.nonce }).toString(),
  }).toString();

  return new URL(`https://id.twitch.tv/oauth2/authorize?${params}`);
}
