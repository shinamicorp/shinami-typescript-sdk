import { createSuiClient } from "@shinami/clients/sui";
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
 * Alternatively, you can also construct a SuiClient using any provider of your choice.
 */
export const sui = createSuiClient(
  process.env.NEXT_PUBLIC_SHINAMI_NODE_ACCESS_KEY ??
    throwExpression(
      new Error("NEXT_PUBLIC_SHINAMI_NODE_ACCESS_KEY not configured"),
    ),
  process.env.NEXT_PUBLIC_SHINAMI_NODE_RPC_URL_OVERRIDE,
  process.env.NEXT_PUBLIC_SHINAMI_NODE_WS_URL_OVERRIDE,
);
