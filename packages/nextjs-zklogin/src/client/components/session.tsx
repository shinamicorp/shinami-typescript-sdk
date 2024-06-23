/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRouter } from "next/router.js";
import React, { FunctionComponent, PropsWithChildren } from "react";
import { LOGIN_PAGE_PATH } from "../../env.js";
import { useMe } from "../hooks/api.js";
import {
  ZkLoginSession,
  ZkLoginSessionActive,
  ZkLoginSessionContext,
  useZkLoginLocalSession,
  useZkLoginSession,
} from "../hooks/session.js";

/**
 * Root React component to provide zkLogin session state.
 *
 * Must be used near the root of your component tree. This component itself must be wrapped in a
 * TanStack `QueryClientProvider`.
 */
export function ZkLoginSessionProvider({ children }: PropsWithChildren) {
  const { data: localSession, isLoading: isLoadingLocalSession } =
    useZkLoginLocalSession();
  const { data: user, isLoading: isLoadingUser } = useMe();

  function session(): ZkLoginSession {
    if (isLoadingLocalSession || isLoadingUser) {
      return { user: undefined, localSession: undefined, isLoading: true };
    } else if (
      localSession &&
      user &&
      localSession.nonce === user.jwtClaims.nonce
    ) {
      return { user, localSession, isLoading: false };
    } else {
      return { user: undefined, localSession: undefined, isLoading: false };
    }
  }

  return (
    <ZkLoginSessionContext.Provider value={session()}>
      {children}
    </ZkLoginSessionContext.Provider>
  );
}

/**
 * React HOC for implementing an auth-protected page.
 *
 * User will be redirected to the login page (default at `/auth/login`) if they don't have an active
 * session.
 *
 * @param Component Your main React component to be rendered, with an active session.
 * @param Loading A transient React component for when the session is being loaded.
 * @param Redirecting A transient React component for when the user is being redirected.
 * @returns Wrapped component.
 */
export function withZkLoginSessionRequired<P extends object, T = unknown>(
  Component: FunctionComponent<P & { session: ZkLoginSessionActive<T> }>,
  Loading: FunctionComponent<P> = () => <p>Loading zkLogin session...</p>,
  Redirecting: FunctionComponent<P> = () => <p>Redirecting to login page...</p>,
): FunctionComponent<P> {
  const WrappedComponent: FunctionComponent<P> = (props) => {
    const session = useZkLoginSession<T>();
    const router = useRouter();

    if (session.isLoading) return <Loading {...props} />;
    if (!session.user) {
      void router.push({
        pathname: LOGIN_PAGE_PATH,
        query: { redirectTo: router.asPath },
      });
      return <Redirecting {...props} />;
    }

    return <Component session={session} {...props} />;
  };
  WrappedComponent.displayName = `WithZkLoginSessionRequired<${Component.displayName}>`;
  return WrappedComponent;
}
