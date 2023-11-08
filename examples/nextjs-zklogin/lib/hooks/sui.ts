import { createSuiClient } from "@shinami/clients";
import { SUI_NETWORK } from "../shared/sui";
import { throwExpression } from "../shared/utils";

const SUI_EXPLORER_BASE_URL = "https://suiexplorer.com";
const SUI_VISION_BASE_URL = `https://${
  SUI_NETWORK === "mainnet" ? "" : `${SUI_NETWORK}.`
}suivision.xyz`;

export function getSuiExplorerAccountUrl(
  address: string,
  suiVision: boolean = false
) {
  return suiVision
    ? `${SUI_VISION_BASE_URL}/account/${address}`
    : `${SUI_EXPLORER_BASE_URL}/address/${address}?network=${SUI_NETWORK}`;
}

export function getSuiExplorerObjectUrl(
  address: string,
  suiVision: boolean = false
) {
  return suiVision
    ? `${SUI_VISION_BASE_URL}/object/${address}`
    : `${SUI_EXPLORER_BASE_URL}/object/${address}?network=${SUI_NETWORK}`;
}

export function getSuiExplorerTransactionUrl(
  digest: string,
  suiVision: boolean = false
) {
  return suiVision
    ? `${SUI_VISION_BASE_URL}/txblock/${digest}`
    : `${SUI_EXPLORER_BASE_URL}/txblock/${digest}?network=${SUI_NETWORK}`;
}

/**
 * A sui client for frontend use.
 *
 * Alternatively, you can also construct a SuiClient using any provider of your choice.
 */
export const sui = createSuiClient(
  process.env.NEXT_PUBLIC_SHINAMI_NODE_ACCESS_KEY ??
    throwExpression(
      new Error("NEXT_PUBLIC_SHINAMI_NODE_ACCESS_KEY not configured")
    ),
  process.env.NEXT_PUBLIC_SHINAMI_NODE_RPC_URL_OVERRIDE,
  process.env.NEXT_PUBLIC_SHINAMI_NODE_WS_URL_OVERRIDE
);
