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

export function inferRegionalValueFromAccessKey<
  V,
  R extends Partial<Record<Region, V>>,
>(accessKey: string, allValues: R, defaultValue: (allValues: R) => V): V {
  const keys = Object.keys(allValues) as Region[];
  for (const key of keys) {
    if (accessKey.startsWith(key)) {
      return allValues[key] ?? defaultValue(allValues);
    }
  }
  return defaultValue(allValues);
}
