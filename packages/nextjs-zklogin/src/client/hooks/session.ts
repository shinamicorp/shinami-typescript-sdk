/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import {
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQueries,
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

export function useZkLoginLocalSession(): UseQueryResult<ZkLoginLocalSession> {
  useQueries;
  return useQuery({
    queryKey: [...zkLoginLocalQueryKey, "localSession"],
    queryFn: () => {
      const secret = localStorage.getItem(EPHEMERAL_SECRET_NAME);
      if (!secret) throw new Error(`${EPHEMERAL_SECRET_NAME} not found`);
      const keyPair = Ed25519Keypair.fromSecretKey(fromB64(secret));

      const _maxEpoch = localStorage.getItem(MAX_EPOCH_NAME);
      if (!_maxEpoch) throw new Error(`${MAX_EPOCH_NAME} not found`);
      const maxEpoch = Number(_maxEpoch);

      const jwtRandomness = localStorage.getItem(JWT_RANDOMNESS_NAME);
      if (!jwtRandomness) throw new Error(`${JWT_RANDOMNESS_NAME} not found`);

      const nonce = localStorage.getItem(NONCE_NAME);
      if (!nonce) throw new Error(`${NONCE_NAME} not found`);

      return { keyPair, maxEpoch, jwtRandomness, nonce };
    },
    retry: false,
  });
}

export function useSaveZkLoginLocalSession(): UseMutationResult<
  void,
  unknown,
  ZkLoginLocalSession
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session) => {
      localStorage.setItem(
        EPHEMERAL_SECRET_NAME,
        session.ephemeralKeyPair.export().privateKey
      );
      localStorage.setItem(MAX_EPOCH_NAME, session.maxEpoch.toString());
      localStorage.setItem(JWT_RANDOMNESS_NAME, session.jwtRandomness);
      localStorage.setItem(NONCE_NAME, session.nonce);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zkLoginLocalQueryKey });
    },
  });
}

export interface ZkLoginSessionLoading {
  user: undefined;
  localSession: undefined;
  isLoading: true;
}

export interface ZkLoginSessionActive {
  user: ZkLoginUser;
  localSession: ZkLoginLocalSession;
  isLoading: false;
}

export interface ZkLoginSessionInactive {
  user: undefined;
  localSession: undefined;
  isLoading: false;
}

export type ZkLoginSession =
  | ZkLoginSessionLoading
  | ZkLoginSessionActive
  | ZkLoginSessionInactive;

export const ZkLoginSessionContext = createContext<ZkLoginSession | null>(null);

export function useZkLoginSession(): ZkLoginSession {
  const session = useContext(ZkLoginSessionContext);
  if (!session)
    throw new Error(
      "useZkLoginSession must be used inside ZkLoginSessionProvider"
    );
  return session;
}
