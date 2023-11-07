import {
  ApiError,
  WithKeyPair,
  apiTxExecMutationFn,
} from "@shinami/nextjs-zklogin/client";
import { UseMutationResult, useMutation } from "@tanstack/react-query";
import { AddRequest, AddResponse } from "../shared/interfaces";

/**
 * An example mutation to execute a Sui transaction.
 *
 * The mutation presents itself as a simple request / response. Under the hood, it's done in 3 steps:
 * - Call /api/add/tx to construct a sponsored transaction block.
 * - Sign the transaction block with the local ephemeral key pair.
 * - Call /api/add/exec to assemble the zkLogin signature and execute the signed transaction block.
 */
export function useAddMutation(): UseMutationResult<
  AddResponse,
  ApiError,
  AddRequest & WithKeyPair
> {
  return useMutation({
    mutationFn: apiTxExecMutationFn({
      baseUri: () => "/api/add",
      body: ({ keyPair, ...req }) => req,
      resultSchema: AddResponse,
    }),
  });
}
