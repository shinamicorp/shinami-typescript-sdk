/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

export type Region = "us1" | "eu1" | "apac1";

export type Chain = "aptos" | "sui";

export function createRegionalApiUrl(
  region: Region,
  chain: Chain,
  service: string,
  scheme: "https" | "wss" = "https",
): string {
  return `${scheme}://api.${region}.shinami.com/${chain}/${service}/v1`;
}
