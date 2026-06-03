import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
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
 * A sui client for frontend use.
 *
 * Defaults to the Mysten public fullnode for the configured network.
 * Override by setting NEXT_PUBLIC_SUI_RPC_URL.
 */
export const sui = new SuiClient({
  url: process.env.NEXT_PUBLIC_SUI_RPC_URL ?? getFullnodeUrl(SUI_NETWORK),
});
