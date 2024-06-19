/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fromB64, fromHEX, toB64, toHEX } from "@mysten/sui/utils";

export function bigIntToBase64(n: bigint): string {
  return toB64(fromHEX(n.toString(16)));
}

export function base64ToBigInt(s: string): bigint {
  return BigInt(`0x${toHEX(fromB64(s))}`);
}
