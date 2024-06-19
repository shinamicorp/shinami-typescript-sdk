import { EXAMPLE_MOVE_PACKAGE_ID } from "@/lib/api/move";
import { gas, sui } from "@/lib/api/shinami";
import { AddRequest, AddResponse, AddResult } from "@/lib/shared/interfaces";
import { first } from "@/lib/shared/utils";
import { buildGaslessTransaction } from "@shinami/clients/sui";
import {
  GaslessTransactionBuilder,
  InvalidRequest,
  TransactionResponseParser,
  zkLoginSponsoredTxExecHandler,
} from "@shinami/nextjs-zklogin/server/pages";
import { mask, validate } from "superstruct";

/**
 * Builds a gasless transaction according to the request.
 */
const buildTx: GaslessTransactionBuilder = async (req, { wallet }) => {
  const [error, body] = validate(req.body, AddRequest);
  if (error) throw new InvalidRequest(error.message);

  console.log("Preparing add tx for zkLogin wallet", wallet);

  return await buildGaslessTransaction((txb) => {
    // Source code for this example Move function:
    // https://github.com/shinamicorp/shinami-typescript-sdk/blob/90f19396df9baadd71704a0c752f759c8e7088b4/move_example/sources/math.move#L13
    txb.moveCall({
      target: `${EXAMPLE_MOVE_PACKAGE_ID}::math::add`,
      arguments: [txb.pure.u64(body.x), txb.pure.u64(body.y)],
    });

    // Optionally, you can set gas budget and price here or in options.
    // txb.setGasBudget(5_000_000);
    // txb.setGasPrice(1_000);
  });
};

/**
 * Parses the transaction response.
 */
const parseTxRes: TransactionResponseParser<AddResponse> = (_, txRes) => {
  // Requires "showEvents: true" in tx response options.
  const event = first(txRes.events);
  if (!event) throw new Error("Event missing from tx response");

  const result = mask(event.parsedJson, AddResult);
  return { ...result, txDigest: txRes.digest };
};

/**
 * An example API route handler providing seamless support for transaction building, sponsorship,
 * and execution.
 *
 * You can also use "zkLoginTxExecHandler" to implement non-sponsored transactions, which would
 * require the user's zkLogin wallet to have enough gas.
 *
 * Both "zkLoginSponsoredTxExecHandler" and "zkLoginTxExecHandler" are auth-protected, requiring the
 * user to have a live session.
 */
export default zkLoginSponsoredTxExecHandler(sui, gas, buildTx, parseTxRes, {
  showEvents: true,
});
