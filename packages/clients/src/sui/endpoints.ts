/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Region } from "../region.js";

function createUrl(region: Region, service: string): string {
  return `https://api.${region}.shinami.com/sui/${service}/v1`;
}

export const NodeRpcUrl: Record<Region, string> = {
  [Region.US1]: createUrl(Region.US1, "node"),
  [Region.EU1]: createUrl(Region.EU1, "node"),
  [Region.APAC1]: createUrl(Region.APAC1, "node"),
};

export const GasStationRpcUrl: Record<Extract<Region, Region.US1>, string> = {
  [Region.US1]: createUrl(Region.US1, "gas"),
};

export const WalletRpcUrl: Record<Extract<Region, Region.US1>, string> = {
  [Region.US1]: createUrl(Region.US1, "wallet"),
};

export const KeyRpcUrl: Record<Extract<Region, Region.US1>, string> = {
  [Region.US1]: createUrl(Region.US1, "key"),
};

export const ZkWalletRpcUrl: Record<Extract<Region, Region.US1>, string> = {
  [Region.US1]: createUrl(Region.US1, "zkwallet"),
};

export const ZkProverRpcUrl: Record<Extract<Region, Region.US1>, string> = {
  [Region.US1]: createUrl(Region.US1, "zkprover"),
};
