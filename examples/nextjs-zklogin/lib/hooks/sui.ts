import { SuiClient } from "@mysten/sui/client";
import { SUI_NETWORK } from "../shared/sui";
import { throwExpression } from "../shared/utils";

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
 * Configure NEXT_PUBLIC_SUI_RPC_URL with your Sui RPC endpoint of choice.
 * This can be the same value as SUI_RPC_URL if you are comfortable exposing
 * the endpoint publicly.
 */
export const sui = new SuiClient({
  url:
    process.env.NEXT_PUBLIC_SUI_RPC_URL ??
    throwExpression(new Error("NEXT_PUBLIC_SUI_RPC_URL not configured")),
});
