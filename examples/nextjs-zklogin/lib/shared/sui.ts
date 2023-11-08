import { throwExpression } from "./utils";

export const SUI_NETWORK =
  process.env.NEXT_PUBLIC_SUI_NETWORK ??
  throwExpression(new Error("NEXT_PUBLIC_SUI_NETWORK not configured"));
