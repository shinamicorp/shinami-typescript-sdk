/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient } from "@mysten/sui.js/client";
import { JWTVerifyGetKey, createRemoteJWKSet } from "jose";
import { OidProvider, PartialZkLoginProof, ZkLoginUserId } from "../user.js";

export interface EpochInfo {
  epoch: number;
  epochStartTimestampMs: number;
  epochDurationMs: number;
}

export type CurrentEpochProvider =
  | (() => Promise<EpochInfo> | EpochInfo)
  | SuiClient;

export async function getCurrentEpoch(
  provider: CurrentEpochProvider
): Promise<EpochInfo> {
  if (provider instanceof SuiClient) {
    const { epoch, epochStartTimestampMs, epochDurationMs } =
      await provider.getLatestSuiSystemState();
    return {
      epoch: Number(epoch),
      epochStartTimestampMs: Number(epochStartTimestampMs),
      epochDurationMs: Number(epochDurationMs),
    };
  }
  return await provider();
}

// TODO - Support WalletClient
export type SaltProvider = (user: ZkLoginUserId) => Promise<bigint> | bigint;

export interface ZkLoginProofInputs {
  jwt: string;
  publicKey: string;
  maxEpoch: number;
  randomness: string;
  salt: bigint;
  keyClaimName: string;
}

// TODO - New Shinami prover client
export type ZkProofProvider = (
  inputs: ZkLoginProofInputs
) => Promise<PartialZkLoginProof>;

interface OidProviderConfig {
  getKey: JWTVerifyGetKey;
  keyClaimName: string;
}

export const oidProviders: { [K in OidProvider]: OidProviderConfig } = {
  google: {
    getKey: createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs")
    ),
    keyClaimName: "sub",
  },
  facebook: {
    getKey: createRemoteJWKSet(
      new URL("https://www.facebook.com/.well-known/oauth/openid/jwks/")
    ),
    keyClaimName: "sub",
  },
  twitch: {
    getKey: createRemoteJWKSet(new URL("https://id.twitch.tv/oauth2/keys")),
    keyClaimName: "sub",
  },
};
