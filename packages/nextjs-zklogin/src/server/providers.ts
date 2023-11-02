/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient } from "@mysten/sui.js/client";
import { PublicKey } from "@mysten/sui.js/cryptography";
import { ZkProverClient } from "@shinami/clients";
import { JWTVerifyGetKey, createRemoteJWKSet } from "jose";
import { OidProvider, PartialZkLoginProof } from "../user.js";

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

export interface SaltRequest {
  jwt: string;
  keyClaimName: string;
  subWallet: number;
}

// TODO - New Shinami zkWallet client
export type SaltProvider = (req: SaltRequest) => Promise<bigint> | bigint;

export async function getSalt(
  provider: SaltProvider,
  req: SaltRequest
): Promise<bigint> {
  return await provider(req);
}

export interface ZkProofRequest {
  jwt: string;
  ephemeralPublicKey: PublicKey;
  maxEpoch: number;
  jwtRandomness: bigint;
  salt: bigint;
  keyClaimName: string;
}

export type ZkProofProvider =
  | ((req: ZkProofRequest) => Promise<PartialZkLoginProof>)
  | ZkProverClient;

export async function getZkProof(
  provider: ZkProofProvider,
  req: ZkProofRequest
): Promise<PartialZkLoginProof> {
  if (provider instanceof ZkProverClient) {
    const { zkProof } = await provider.createZkLoginProof(
      req.jwt,
      req.maxEpoch,
      req.ephemeralPublicKey,
      req.jwtRandomness,
      req.salt,
      req.keyClaimName
    );
    return zkProof as PartialZkLoginProof;
  }

  return await provider(req);
}

interface OidProviderConfig {
  getKey: JWTVerifyGetKey;
}

export const oidProviders: { [K in OidProvider]: OidProviderConfig } = {
  google: {
    getKey: createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs")
    ),
  },
  facebook: {
    getKey: createRemoteJWKSet(
      new URL("https://www.facebook.com/.well-known/oauth/openid/jwks/")
    ),
  },
  twitch: {
    getKey: createRemoteJWKSet(new URL("https://id.twitch.tv/oauth2/keys")),
  },
};
