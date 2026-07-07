/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "@jest/globals";
import { base64ToBigInt, bigIntToBase64 } from "../../src/sui/utils.js";

describe("bigIntToBase64 / base64ToBigInt", () => {
  it("round-trips a large bigint", () => {
    const n = BigInt("123456789012345678901234567890");
    expect(base64ToBigInt(bigIntToBase64(n))).toBe(n);
  });

  it("round-trips zero", () => {
    const n = BigInt(0);
    expect(base64ToBigInt(bigIntToBase64(n))).toBe(n);
  });
});
