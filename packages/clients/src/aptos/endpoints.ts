/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Region } from "../region.js";

function createUrl(region: Region, type: string): string {
  return `https://api.${region}.shinami.com/aptos/${type}/v1`;
}

export const NodeIndexerUrl: Record<Extract<Region, Region.US1>, string> = {
  [Region.US1]: createUrl(Region.US1, "graphql"),
};

export const NodeRestUrl: Record<Extract<Region, Region.US1>, string> = {
  [Region.US1]: createUrl(Region.US1, "node"),
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
