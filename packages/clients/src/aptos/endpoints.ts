/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Region, createRegionalApiUrl } from "../region.js";

export const GasStationRpcUrls = {
  us1: createRegionalApiUrl("us1", "aptos", "gas"),
} as const satisfies Partial<Record<Region, string>>;

export const MovementGasStationRpcUrls = {
  us1: createRegionalApiUrl("us1", "movement", "gas"),
} as const satisfies Partial<Record<Region, string>>;

export const WalletRpcUrls = {
  us1: createRegionalApiUrl("us1", "aptos", "wallet"),
} as const satisfies Partial<Record<Region, string>>;

export const MovementWalletRpcUrls = {
  us1: createRegionalApiUrl("us1", "movement", "wallet"),
} as const satisfies Partial<Record<Region, string>>;

export const KeyRpcUrls = {
  us1: createRegionalApiUrl("us1", "aptos", "key"),
} as const satisfies Partial<Record<Region, string>>;

export const MovementKeyRpcUrls = {
  us1: createRegionalApiUrl("us1", "movement", "key"),
} as const satisfies Partial<Record<Region, string>>;
