import { getFullnodeUrl } from "@mysten/sui/client";
import { throwExpression } from "./utils";

export type SuiNetwork = Parameters<typeof getFullnodeUrl>[0];

export const SUI_NETWORK: SuiNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK ??
  throwExpression(
    new Error("NEXT_PUBLIC_SUI_NETWORK not configured"),
  )) as SuiNetwork;
