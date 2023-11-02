/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fromHEX, toB64 } from "@mysten/sui.js/utils";

export function bigIntToBase64(n: bigint): string {
  return toB64(fromHEX(n.toString(16)));
}
