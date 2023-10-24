/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ed25519PublicKey } from "@mysten/sui.js/keypairs/ed25519";
import { getZkLoginSignature } from "@mysten/sui.js/zklogin";
import { Infer, enums, integer, object, refine, string } from "superstruct";

export const Ed25519PublicKeyString = refine(
  string(),
  "Ed25519PublicKey",
  (value) => {
    try {
      new Ed25519PublicKey(value);
      return true;
    } catch (e) {
      if (e instanceof Error) return e.message;
      throw e;
    }
  }
);
export type Ed25519PublicKeyString = Infer<typeof Ed25519PublicKeyString>;

export const OidProvider = enums(["google", "facebook", "twitch"]);
export type OidProvider = Infer<typeof OidProvider>;

export const ZkLoginRequest = object({
  oidProvider: OidProvider,
  jwt: string(),
  publicKey: Ed25519PublicKeyString,
  maxEpoch: integer(),
  randomness: string(),
});
export type ZkLoginRequest = Infer<typeof ZkLoginRequest>;

export const ZkLoginUserId = object({
  iss: string(),
  aud: string(),
  claimName: string(),
  claimValue: string(),
});
export type ZkLoginUserId = Infer<typeof ZkLoginUserId>;

export const ZkLoginUser = object({
  id: ZkLoginUserId,
  oidProvider: OidProvider,
  jwtClaims: object(),
  publicKey: Ed25519PublicKeyString,
  maxEpoch: integer(),
  wallet: string(),
  zkProof: object(),
});
export type ZkLoginUser = Infer<typeof ZkLoginUser>;

export type ZkLoginProof = Parameters<
  typeof getZkLoginSignature
>["0"]["inputs"];
export type PartialZkLoginProof = Omit<ZkLoginProof, "addressSeed">;

export function assembleZkLoginSignature(
  user: ZkLoginUser,
  userSignature: string
): string {
  return getZkLoginSignature({
    inputs: user.zkProof as ZkLoginProof,
    maxEpoch: user.maxEpoch,
    userSignature,
  });
}
