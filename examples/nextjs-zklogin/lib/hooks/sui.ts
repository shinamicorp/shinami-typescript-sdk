import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SUI_NETWORK } from "../shared/sui";

const SUI_VISION_BASE_URL = `https://${
  SUI_NETWORK === "mainnet" ? "" : `${SUI_NETWORK}.`
}suivision.xyz`;

export function getSuiVisionAccountUrl(address: string) {
  return `${SUI_VISION_BASE_URL}/account/${address}`;
}

export function getSuiVisionObjectUrl(address: string) {
  return `${SUI_VISION_BASE_URL}/object/${address}`;
}

export function getSuiVisionTransactionUrl(digest: string) {
  return `${SUI_VISION_BASE_URL}/txblock/${digest}`;
}

/**
 * A sui client for frontend use, over gRPC.
 *
 * Defaults to the Mysten public fullnode for the configured network.
 * Override by setting NEXT_PUBLIC_SUI_RPC_URL.
 *
 * For an authenticated endpoint, use GrpcWebFetchTransport with SuiGrpcClient
 */
export const sui = new SuiGrpcClient({
  baseUrl:
    process.env.NEXT_PUBLIC_SUI_RPC_URL ??
    `https://fullnode.${SUI_NETWORK}.sui.io:443`,
  network: SUI_NETWORK,
});
