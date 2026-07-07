/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fromBase64, fromHex, toBase64, toHex } from "@mysten/sui/utils";

export function bigIntToBase64(n: bigint): string {
  return toBase64(fromHex(n.toString(16)));
}

export function base64ToBigInt(s: string): bigint {
  return BigInt(`0x${toHex(fromBase64(s))}`);
}
