/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient } from "@mysten/sui/client";
import React, { FunctionComponent, useEffect, useState } from "react";
import { useNewZkLoginSession } from "../hooks/login.js";
import { ZkLoginLocalSession } from "../hooks/session.js";

/**
 * React HOC for implementing the login page.
 *
 * Resets local session state and prepares a new one. The new session state will be needed to get a
 * new JWT from the OpenID providers.
 *
 * @param getMaxEpoch The function to determine the maxEpoch for this zkLogin session.
 *    Usually you would want this to be `relativeToCurrentEpoch`.
 * @param Component Your React component that renders the login page.
 *    The props will be augmented with the new session state.
 * @param Loading A transient React component for when the session is being initialized.
 * @returns The wrapped component.
 */
export function withNewZkLoginSession<P extends object>(
  getMaxEpoch: () => Promise<number> | number,
  Component: FunctionComponent<P & { session: ZkLoginLocalSession }>,
  Loading: FunctionComponent<P> = () => <p>Preparing zkLogin session...</p>,
) {
  const WrappedComponent: FunctionComponent<P> = (props) => {
    const { mutateAsync: newSession } = useNewZkLoginSession();
    const [session, setSession] = useState<ZkLoginLocalSession>();

    useEffect(() => {
      void (async () => {
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

/**
 * Helper function to calculate a epoch relative to the current one.
 *
 * The current epoch is retrieved using `SuiClient`.
 *
 * @param sui The `SuiClient`.
 * @param epochsBeyondCurrent The number of epochs beyond the current one.
 *    Defaults to 1, i.e. the next epoch.
 * @returns Epoch number.
 */
export async function relativeToCurrentEpoch(
  sui: SuiClient,
  epochsBeyondCurrent = 1,
): Promise<number> {
  const { epoch } = await sui.getLatestSuiSystemState();
  return Number(epoch) + epochsBeyondCurrent;
}

/**
 * Helper function to compose the auth URL for Google.
 *
 * You'll need to redirect your user to this URL to complete the sign-in process.
 *
 * @param session A new zkLogin local session. Can be prepared with `useNewZkLoginSession`.
 * @param clientId Your OAuth application client id.
 * @param callback The callback page URL. Must be whitelisted on your OAuth application settings.
 *    A login will be initiated with your app backend from the callback page.
 * @param redirectTo The redirect path after a successful login.
 * @param extraScopes The "openid" scope is included by default. You can optionally request extra
 *    scopes, e.g. "email", which will be included in the JWT claims that can be consumed by your
 *    app. Your OAuth application must have the permission to request these scopes.
 * @param prompt The information to prompt for. See the Google developer link below for details.
 * @returns The Google auth URL.
 *
 * @see https://developers.google.com/identity/openid-connect/openid-connect#sendauthrequest
 */
export function getGoogleAuthUrl(
  session: ZkLoginLocalSession,
  clientId: string,
  callback: URL,
  redirectTo = "/",
  extraScopes: string[] = [],
  prompt: string[] = [],
): URL {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback.toString(),
    response_type: "id_token",
    scope: ["openid", ...extraScopes].join(" "),
    nonce: session.nonce,
    state: new URLSearchParams({ redirectTo, nonce: session.nonce }).toString(),
    prompt: prompt.join(" "),
  }).toString();

  return new URL(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

/**
 * Helper function to compose the auth URL for Facebook.
 *
 * You'll need to redirect your user to this URL to complete the sign-in process.
 *
 * @param session A new zkLogin local session. Can be prepared with `useNewZkLoginSession`.
 * @param clientId Your OAuth application client id.
 * @param callback The callback page URL. Must be whitelisted on your OAuth application settings.
 *    A login will be initiated with your app backend from the callback page.
 * @param redirectTo The redirect path after a successful login.
 * @param extraScopes The "openid" scope is included by default. You can optionally request extra
 *    scopes, e.g. "email", which will be included in the JWT claims that can be consumed by your
 *    app. Your OAuth application must have the permission to request these scopes.
 * @returns The Facebook auth URL.
 *
 * @see https://developers.facebook.com/docs/facebook-login/guides/advanced/oidc-token
 */
export function getFacebookAuthUrl(
  session: ZkLoginLocalSession,
  clientId: string,
  callback: URL,
  redirectTo = "/",
  extraScopes: string[] = [],
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

/**
 * Helper function to compose the auth URL for Twitch.
 *
 * You'll need to redirect your user to this URL to complete the sign-in process.
 *
 * @param session A new zkLogin local session. Can be prepared with `useNewZkLoginSession`.
 * @param clientId Your OAuth application client id.
 * @param callback The callback page URL. Must be whitelisted on your OAuth application settings.
 *    A login will be initiated with your app backend from the callback page.
 * @param redirectTo The redirect path after a successful login.
 * @param extraScopes The "openid" scope is included by default. You can optionally request extra
 *    scopes, e.g. "user:read:email".
 *    Your OAuth application must have the permission to request these scopes.
 * @param extraClaims Extra claims to be included in the JWT, e.g. "email".
 * @returns The Twitch auth URL.
 *
 * @see https://dev.twitch.tv/docs/authentication/getting-tokens-oidc/#oidc-implicit-grant-flow
 */
export function getTwitchAuthUrl(
  session: ZkLoginLocalSession,
  clientId: string,
  callback: URL,
  redirectTo = "/",
  extraScopes: string[] = [],
  extraClaims: string[] = [],
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
