import { SuiClient } from "@mysten/sui/client";
import {
  GasStationClient,
  ZkProverClient,
  ZkWalletClient,
} from "@shinami/clients/sui";
import { throwExpression } from "../shared/utils";

// This key is only used on the backend / api. It's not exposed to the frontend.
const SHINAMI_SUPER_ACCESS_KEY =
  process.env.SHINAMI_SUPER_ACCESS_KEY ??
  throwExpression(new Error("SHINAMI_SUPER_ACCESS_KEY not configured"));

/**
 * A sui client for backend use only.
 *
 * Configure SUI_RPC_URL with your Sui RPC endpoint of choice.
 * This can be the same value as NEXT_PUBLIC_SUI_RPC_URL if you are comfortable
 * exposing the endpoint publicly.
 */
export const sui = new SuiClient({
  url:
    process.env.SUI_RPC_URL ??
    throwExpression(new Error("SUI_RPC_URL not configured")),
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
