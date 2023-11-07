import { EXAMPLE_MOVE_PACKAGE_ID } from "@/lib/api/move";
import { gas, sui } from "@/lib/api/shinami";
import { AddRequest, AddResponse, AddResult } from "@/lib/shared/interfaces";
import { first } from "@/lib/shared/utils";
import { buildGaslessTransactionBytes } from "@shinami/clients";
import {
  GaslessTransactionBytesBuilder,
  InvalidRequest,
  TransactionResponseParser,
  zkLoginSponsoredTxExecHandler,
} from "@shinami/nextjs-zklogin/server/pages";
import { mask, validate } from "superstruct";

/**
 * Builds a gasless transaction block according to the request.
 */
const buildTx: GaslessTransactionBytesBuilder = async (req, { wallet }) => {
  const [error, body] = validate(req.body, AddRequest);
  if (error) throw new InvalidRequest(error.message);

  console.log("Preparing add tx for zkLogin wallet", wallet);

  const gaslessTxBytes = await buildGaslessTransactionBytes({
    sui,
    build: async (txb) => {
      // Source code for this example Move function:
      // https://github.com/shinamicorp/shinami-typescript-sdk/blob/90f19396df9baadd71704a0c752f759c8e7088b4/move_example/sources/math.move#L13
      txb.moveCall({
        target: `${EXAMPLE_MOVE_PACKAGE_ID}::math::add`,
        arguments: [txb.pure(body.x), txb.pure(body.y)],
      });
    },
  });

  return { gaslessTxBytes, gasBudget: 5_000_000 };
};

/**
 * Parses the transaction response.
 */
const parseTxRes: TransactionResponseParser<AddResponse> = async (_, txRes) => {
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
