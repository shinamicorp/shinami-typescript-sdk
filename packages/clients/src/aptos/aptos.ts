/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

const NODE_REST_URL = "https://api.shinami.com/aptos/node/v1";
const NODE_INDEXER_URL = "https://api.shinami.com/aptos/graphql/v1";

/**
 * Creates an Aptos client pointing to Shinami Node Service
 * @param accessKey Node access key, created in Shinami dashboard. Note that this determines what network you targeting
 * @param url Optional URL for fullnode. Defaults to Shinami's API
 * @param indexerUrl Optional URL for indexer. Defaults to Aptos's mainnet public indexer.
 * @returns Aptos client using Shinami Node service.
 */
export function createAptosClient(
  accessKey: string,
  url: string = NODE_REST_URL,
  indexerUrl: string = NODE_INDEXER_URL,
): Aptos {
  const faucetUrl =
    accessKey.indexOf("testnet") == -1
      ? undefined
      : "https://faucet.testnet.aptoslabs.com";
  return new Aptos(
    new AptosConfig({
      fullnode: url,
      indexer: indexerUrl,
      clientConfig: {
        API_KEY: accessKey,
      },
      faucet: faucetUrl,
    }),
  );
}
