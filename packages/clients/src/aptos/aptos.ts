/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const NODE_REST_URL = "https://api.shinami.com/aptos/node/v1";
const NODE_INDEXER_URL = "https://api.shinami.com/aptos/graphql/v1";

/**
 * A private function which infers the network enum from a Shinami access key
 * @param accessKey
 * @returns a Network enum type or undefined
 */
function inferNetworkFromKey(accessKey: string): Network | undefined {
  if (accessKey.startsWith("aptos_devnet")) {
    return Network.DEVNET;
  } else if (accessKey.startsWith("aptos_testnet")) {
    return Network.TESTNET;
  } else if (accessKey.startsWith("aptos_mainnet")) {
    return Network.MAINNET;
  } else if (accessKey.startsWith("aptos_local")) {
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
  url: string = NODE_REST_URL,
  indexerUrl: string = NODE_INDEXER_URL,
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
