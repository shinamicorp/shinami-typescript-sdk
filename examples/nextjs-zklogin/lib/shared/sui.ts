import { SuiClientTypes } from "@mysten/sui/client";
import { throwExpression } from "./utils";

export const SUI_NETWORK: SuiClientTypes.Network = (process.env
  .NEXT_PUBLIC_SUI_NETWORK ??
  throwExpression(
    new Error("NEXT_PUBLIC_SUI_NETWORK not configured"),
  )) as SuiClientTypes.Network;
