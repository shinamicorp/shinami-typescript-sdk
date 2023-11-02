/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Keypair } from "@mysten/sui.js/cryptography";
import { fromB64 } from "@mysten/sui.js/utils";
import { MutationFunction } from "@tanstack/react-query";
import { Struct } from "superstruct";
import { PreparedTransactionBytes, SignedTransactionBytes } from "../../tx.js";
import { apiMutationFn } from "./api.js";

export interface WithKeyPair {
  keyPair: Keypair;
}

export function apiTxExecMutationFn<
  T = unknown,
  P extends WithKeyPair = WithKeyPair
>({
  baseUri,
  body,
  resultSchema,
}: {
  baseUri: (params: P) => string;
  body?: (params: P) => unknown;
  resultSchema?: Struct<T>;
}): MutationFunction<T, P> {
  const _body = body ?? (({ keyPair, ...params }) => params);

  return async (params: P) => {
    const uri = baseUri(params);
    const tx = await apiMutationFn({
      uri: () => `${uri}/tx`,
      body: _body,
      resultSchema: PreparedTransactionBytes,
    })(params);
    const { signature } = await params.keyPair.signTransactionBlock(
      fromB64(tx.txBytes)
    );
    return await apiMutationFn<T, SignedTransactionBytes>({
      uri: () => `${uri}/exec`,
      resultSchema,
    })({ ...tx, signature });
  };
}
