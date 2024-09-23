/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

const NODE_REST_URL = "https://api.shinami.com/aptos/node/v1";
const NODE_INDEXER_URL =
  "http://aptos-mainnet-graphql.aptos-node:8080/v1/graphql";

/**
 * Creates an Aptos client pointing to Shinami Node Service
 * @param accessKey Node access key, set in Shinami UI. Note that this determines what network you targeting
 * @param url Optional URL for fullnode. Defaults to Shinami's API
 * @param indexerUrl Optional URL for indexer. Defaults to Aptos's mainnet public indexer.
 * @returns Aptos client using Shinami Node service.
 */
export function createAptosClient(
  accessKey: string,
  url: string = NODE_REST_URL,
  indexerUrl: string = NODE_INDEXER_URL,
): Aptos {
  return new Aptos(
    new AptosConfig({
      fullnode: url,
      indexer: indexerUrl,
      clientConfig: {
        API_KEY: accessKey,
      },
    }),
  );
}
