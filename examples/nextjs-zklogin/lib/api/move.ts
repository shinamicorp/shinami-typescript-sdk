import { throwExpression } from "../shared/utils";

export const EXAMPLE_MOVE_PACKAGE_ID =
  process.env.EXAMPLE_MOVE_PACKAGE_ID ??
  throwExpression(new Error("EXAMPLE_MOVE_PACKAGE_ID not configured"));
