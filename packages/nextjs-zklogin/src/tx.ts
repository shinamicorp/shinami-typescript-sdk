/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Infer, object, optional, string } from "superstruct";

export const PreparedTransactionBytes = object({
  txBytes: string(),
  gasSignature: optional(string()),
});
export type PreparedTransactionBytes = Infer<typeof PreparedTransactionBytes>;

export const SignedTransactionBytes = object({
  ...PreparedTransactionBytes.schema,
  signature: string(),
});
export type SignedTransactionBytes = Infer<typeof SignedTransactionBytes>;
