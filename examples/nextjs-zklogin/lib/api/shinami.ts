import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  GasStationClient,
  ZkProverClient,
  ZkWalletClient,
} from "@shinami/clients/sui";
import { SUI_NETWORK } from "../shared/sui";
import { throwExpression } from "../shared/utils";

// This key is only used on the backend / api. It's not exposed to the frontend.
const SHINAMI_SUPER_ACCESS_KEY =
  process.env.SHINAMI_SUPER_ACCESS_KEY ??
  throwExpression(new Error("SHINAMI_SUPER_ACCESS_KEY not configured"));

/**
 * A sui client for backend use only, over gRPC.
 *
 * Defaults to the Mysten public fullnode for the configured network.
 * Override by setting SUI_RPC_URL.
 *
 * For an authenticated endpoint, use GrpcWebFetchTransport with SuiGrpcClient
 */
export const sui = new SuiGrpcClient({
  baseUrl:
    process.env.SUI_RPC_URL ?? `https://fullnode.${SUI_NETWORK}.sui.io:443`,
  network: SUI_NETWORK,
});

/**
 * A sui GraphQL client for backend use only.
 *
 * Used only for queries with no gRPC equivalent yet, e.g. listing recent transactions by sender.
 * See: https://docs.sui.io/references/sui-api/graphql
 *
 * Defaults to the Mysten public GraphQL endpoint for the configured network.
 * Override by setting SUI_GRAPHQL_URL.
 */
export const suiGraphql = new SuiGraphQLClient({
  url:
    process.env.SUI_GRAPHQL_URL ??
    `https://graphql.${SUI_NETWORK}.sui.io/graphql`,
  network: SUI_NETWORK,
});

/**
 * Shinami gas station client.
 *
 * Required only if you want to support sponsored transactions.
 */
export const gas = new GasStationClient(
  SHINAMI_SUPER_ACCESS_KEY,
  process.env.SHINAMI_GAS_RPC_URL_OVERRIDE,
);

/**
 * Shinami zkWallet client.
 *
 * Alternatively, you can also use mystenSaltProvider.
 */
export const zkw = new ZkWalletClient(
  SHINAMI_SUPER_ACCESS_KEY,
  process.env.SHINAMI_ZKWALLET_RPC_URL_OVERRIDE,
);

/**
 * Shinami zkProver client.
 *
 * Alternatively, you can also use mystenProver.
 */
export const zkp = new ZkProverClient(
  SHINAMI_SUPER_ACCESS_KEY,
  process.env.SHINAMI_ZKPROVER_RPC_URL_OVERRIDE,
);
