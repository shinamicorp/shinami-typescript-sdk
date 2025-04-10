/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { NodeIndexerUrls, NodeRestUrls } from "./endpoints.js";
import { inferUrlFromAccessKey } from "../region.js";

/**
 * A private function which infers the network enum from a Shinami access key
 * @param accessKey
 * @returns a Network enum type or undefined
 */
function inferNetworkFromKey(accessKey: string): Network | undefined {
  if (accessKey.includes("aptos_devnet")) {
    return Network.DEVNET;
  } else if (accessKey.includes("aptos_testnet")) {
    return Network.TESTNET;
  } else if (accessKey.includes("aptos_mainnet")) {
    return Network.MAINNET;
  } else if (accessKey.includes("aptos_local")) {
    return Network.LOCAL;
  } else {
    console.warn(
      "Access key network qualifier not found, setting as undefined",
    );
    return undefined;
  }
}

/**
 * Creates an Aptos client pointing to Shinami Node Service
 * @param accessKey Node access key, created in Shinami dashboard. Note that this determines what network you targeting
 * @param url Optional URL for fullnode. Defaults to Shinami's API
 * @param indexerUrl Optional URL for indexer. Defaults to Shinami's GraphQL server.
 * @returns Aptos client using Shinami Node service.
 */
export function createAptosClient(
  accessKey: string,
  url: string = inferUrlFromAccessKey(
    accessKey,
    NodeRestUrls,
    (nodeRestUrls) => nodeRestUrls.us1,
  ),
  indexerUrl: string = inferUrlFromAccessKey(
    accessKey,
    NodeIndexerUrls,
    (nodeIndexerUrls) => nodeIndexerUrls.us1,
  ),
): Aptos {
  const network = inferNetworkFromKey(accessKey);
  return new Aptos(
    new AptosConfig({
      fullnode: url,
      indexer: indexerUrl,
      clientConfig: {
        API_KEY: accessKey,
      },
      network: network,
    }),
  );
}
