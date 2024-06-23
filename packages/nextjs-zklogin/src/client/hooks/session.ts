/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { BigIntString, ZkLoginUser } from "../../user.js";

const EPHEMERAL_SECRET_NAME = "zklEphemeralSecret";
const MAX_EPOCH_NAME = "zklMaxEpoch";
const JWT_RANDOMNESS_NAME = "zklJwtRandomness";
const NONCE_NAME = "zklNonce";

export interface ZkLoginLocalSession {
  ephemeralKeyPair: Ed25519Keypair;
  maxEpoch: number;
  jwtRandomness: BigIntString;
  nonce: string;
}

const zkLoginLocalQueryKey = ["local", "zkLogin"];

/**
 * React hook for fetching zkLogin local session state.
 *
 * Uses TanStack query.
 */
export function useZkLoginLocalSession(): UseQueryResult<ZkLoginLocalSession> {
  return useQuery({
    queryKey: [...zkLoginLocalQueryKey, "localSession"],
    queryFn: () => {
      const secret = localStorage.getItem(EPHEMERAL_SECRET_NAME);
      if (!secret) throw new Error(`${EPHEMERAL_SECRET_NAME} not found`);
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
        decodeSuiPrivateKey(secret).secretKey,
      );

      const _maxEpoch = localStorage.getItem(MAX_EPOCH_NAME);
      if (!_maxEpoch) throw new Error(`${MAX_EPOCH_NAME} not found`);
      const maxEpoch = Number(_maxEpoch);

      const jwtRandomness = localStorage.getItem(JWT_RANDOMNESS_NAME);
      if (!jwtRandomness) throw new Error(`${JWT_RANDOMNESS_NAME} not found`);

      const nonce = localStorage.getItem(NONCE_NAME);
      if (!nonce) throw new Error(`${NONCE_NAME} not found`);

      const session: ZkLoginLocalSession = {
        ephemeralKeyPair,
        maxEpoch,
        jwtRandomness,
        nonce,
      };
      return session;
    },
    retry: false,
  });
}

/**
 * React hook for saving zkLogin local session state.
 *
 * Uses TanStack mutation.
 */
export function useSaveZkLoginLocalSession(): UseMutationResult<
  void,
  unknown,
  ZkLoginLocalSession
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (session) => {
      localStorage.setItem(
        EPHEMERAL_SECRET_NAME,
        session.ephemeralKeyPair.getSecretKey(),
      );
      localStorage.setItem(MAX_EPOCH_NAME, session.maxEpoch.toString());
      localStorage.setItem(JWT_RANDOMNESS_NAME, session.jwtRandomness);
      localStorage.setItem(NONCE_NAME, session.nonce);
      return Promise.resolve();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: zkLoginLocalQueryKey });
    },
  });
}

export interface ZkLoginSessionLoading {
  user: undefined;
  localSession: undefined;
  isLoading: true;
}

export interface ZkLoginSessionActive<T = unknown> {
  user: ZkLoginUser<T>;
  localSession: ZkLoginLocalSession;
  isLoading: false;
}

export interface ZkLoginSessionInactive {
  user: undefined;
  localSession: undefined;
  isLoading: false;
}

export type ZkLoginSession<T = unknown> =
  | ZkLoginSessionLoading
  | ZkLoginSessionActive<T>
  | ZkLoginSessionInactive;

export const ZkLoginSessionContext = createContext<ZkLoginSession | null>(null);

/**
 * React hook to use data from the user's current zkLogin session.
 *
 * The returned data could be one of these types:
 * - `ZkLoginSessionLoading`
 * - `ZkLoginSessionActive`
 * - `ZkLoginSessionInactive`
 */
export function useZkLoginSession<T = unknown>(): ZkLoginSession<T> {
  const session = useContext(ZkLoginSessionContext) as ZkLoginSession<T>;
  if (!session)
    throw new Error(
      "useZkLoginSession must be used inside ZkLoginSessionProvider",
    );
  return session;
}
