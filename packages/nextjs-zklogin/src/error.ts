/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Infer, object, string } from "superstruct";

export const ApiErrorBody = object({
  error: string(),
});
export type ApiErrorBody = Infer<typeof ApiErrorBody>;
