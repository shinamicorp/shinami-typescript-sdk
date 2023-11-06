/**
 * Copyright 2023 Shinami Corp.
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

export function withZkLoginSessionRequired<P extends object, T = unknown>(
  Component: FunctionComponent<P & { session: ZkLoginSessionActive<T> }>,
  Loading: FunctionComponent<P> = () => <p>Loading zkLogin session...</p>,
  Redirecting: FunctionComponent<P> = () => <p>Redirecting to login page...</p>
): FunctionComponent<P> {
  const WrappedComponent: FunctionComponent<P> = (props) => {
    const session = useZkLoginSession<T>();
    const router = useRouter();

    if (session.isLoading) return <Loading {...props} />;
    if (!session.user) {
      router.push({
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
