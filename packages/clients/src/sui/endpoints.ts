/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRegionalApiUrl, Region } from "../region.js";

export const NodeRpcUrls = {
  us1: createRegionalApiUrl("us1", "sui", "node"),
  eu1: createRegionalApiUrl("eu1", "sui", "node"),
  apac1: createRegionalApiUrl("apac1", "sui", "node"),
} as const satisfies Partial<Record<Region, string>>;

export const NodeWsUrls = {
  us1: createRegionalApiUrl("us1", "sui", "node", "wss"),
  eu1: createRegionalApiUrl("eu1", "sui", "node", "wss"),
  apac1: createRegionalApiUrl("apac1", "sui", "node", "wss"),
} as const satisfies Partial<Record<Region, string>>;

export const GasStationRpcUrls = {
  us1: createRegionalApiUrl("us1", "sui", "gas"),
} as const satisfies Partial<Record<Region, string>>;

export const WalletRpcUrls = {
  us1: createRegionalApiUrl("us1", "sui", "wallet"),
} as const satisfies Partial<Record<Region, string>>;

export const KeyRpcUrls = {
  us1: createRegionalApiUrl("us1", "sui", "key"),
} as const satisfies Partial<Record<Region, string>>;

export const ZkWalletRpcUrls = {
  us1: createRegionalApiUrl("us1", "sui", "zkwallet"),
} as const satisfies Partial<Record<Region, string>>;

export const ZkProverRpcUrls = {
  us1: createRegionalApiUrl("us1", "sui", "zkprover"),
} as const satisfies Partial<Record<Region, string>>;
