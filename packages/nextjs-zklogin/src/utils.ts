/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PublicKey,
  SIGNATURE_SCHEME_TO_FLAG,
} from "@mysten/sui.js/cryptography";
import { Ed25519PublicKey } from "@mysten/sui.js/keypairs/ed25519";
import { Secp256k1PublicKey } from "@mysten/sui.js/keypairs/secp256k1";
import { Secp256r1PublicKey } from "@mysten/sui.js/keypairs/secp256r1";
import { fromB64 } from "@mysten/sui.js/utils";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export function first<T>(value?: T | T[]): T | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) value = [value];
  return value[0];
}

export function throwExpression(error: unknown): never {
  throw error;
}

// This is the inverse of PublicKey.toSuiPublicKey()
export function publicKeyFromBase64(b64: string): PublicKey {
  const bytes = fromB64(b64);
  if (bytes.length === 0) throw new Error("Empty key bytes");

  switch (bytes[0]) {
    case SIGNATURE_SCHEME_TO_FLAG.ED25519:
      return new Ed25519PublicKey(bytes.slice(1));
    case SIGNATURE_SCHEME_TO_FLAG.Secp256k1:
      return new Secp256k1PublicKey(bytes.slice(1));
    case SIGNATURE_SCHEME_TO_FLAG.Secp256r1:
      return new Secp256r1PublicKey(bytes.slice(1));
    default:
      throw new Error(`Unsupported key flag ${bytes[0]}`);
  }
}
