/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getZkLoginSignature } from "@mysten/sui.js/zklogin";
import { ZkLoginUserId } from "@shinami/clients";
import {
  Infer,
  array,
  enums,
  integer,
  object,
  refine,
  string,
  type,
  union,
} from "superstruct";
import { publicKeyFromBase64 } from "./utils.js";
export { ZkLoginUserId } from "@shinami/clients";

export const ExtendedPublicKeyString = refine(
  string(),
  "ExtendedPublicKeyString",
  (value) => {
    try {
      publicKeyFromBase64(value);
      return true;
    } catch (e) {
      if (e instanceof Error) return e.message;
      throw e;
    }
  }
);
export type ExtendedPublicKeyString = Infer<typeof ExtendedPublicKeyString>;

export const BigIntString = refine(string(), "BigIntString", (value) => {
  try {
    BigInt(value);
    return true;
  } catch (e) {
    if (e instanceof Error) return e.message;
    throw e;
  }
});
export type BigIntString = Infer<typeof BigIntString>;

export const OidProvider = enums(["google", "facebook", "twitch"]);
export type OidProvider = Infer<typeof OidProvider>;

export const ZkLoginRequest = object({
  oidProvider: OidProvider,
  jwt: string(),
  extendedEphemeralPublicKey: ExtendedPublicKeyString,
  maxEpoch: integer(),
  jwtRandomness: BigIntString,
  keyClaimName: string(),
});
export type ZkLoginRequest = Infer<typeof ZkLoginRequest>;

export const ZkLoginUser = object({
  id: ZkLoginUserId,
  oidProvider: OidProvider,
  jwtClaims: type({
    iss: string(),
    aud: union([string(), array(string())]),
    nonce: string(),
  }),
  maxEpoch: integer(),
  wallet: string(),
  zkProof: type({}),
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
