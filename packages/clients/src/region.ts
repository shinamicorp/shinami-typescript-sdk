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

export function inferUrlFromAccessKey<V, R extends Partial<Record<Region, V>>>(
  accessKey: string,
  urls: R,
  defaultUrl: (urls: R) => V,
): V {
  const keys = Object.keys(urls) as Region[];
  for (const key of keys) {
    if (accessKey.startsWith(key)) {
      return urls[key] ?? defaultUrl(urls);
    }
  }
  return defaultUrl(urls);
}
