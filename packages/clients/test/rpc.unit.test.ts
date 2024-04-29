/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterAll, afterEach, describe, expect, it, jest } from "@jest/globals";
import { Client, JSONRPCError } from "@open-rpc/client-js";
import { StructError, number, string } from "superstruct";
import {
  ShinamiRpcClient,
  errorDetails,
  trimTrailingParams,
} from "../src/rpc.js";

describe("ShinamiRpcClient", () => {
  const mockRequest = jest
    .spyOn(Client.prototype, "request")
    .mockImplementation(async ({ method }) =>
      method === "rpc.discover" ? { openrpc: "fake version" } : "fake result",
    );

  afterEach(() => {
    mockRequest.mockClear();
  });
  afterAll(() => {
    mockRequest.mockRestore();
  });

  it("successfully validates result schema for request", async () => {
    const client = new ShinamiRpcClient("fake_access_key", "fake_url");
    expect(await client.request("fakeMethod", [], string())).toBe(
      "fake result",
    );
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("fails to validates result schema for request", async () => {
    const client = new ShinamiRpcClient("fake_access_key", "fake_url");
    expect(client.request("fakeMethod", [], number())).rejects.toThrow(
      StructError,
    );
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("skips result schema validation for request", async () => {
    const client = new ShinamiRpcClient("fake_access_key", "fake_url");
    expect(await client.request("fakeMethod", [])).toBe("fake result");
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("returns rpc spec", async () => {
    const client = new ShinamiRpcClient("fake_access_key", "fake_url");
    expect(await client.rpcDiscover()).toEqual({ openrpc: "fake version" });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe("trimTrailingParams", () => {
  it("removes all trailing undefined params", () => {
    expect(
      trimTrailingParams([1, undefined, 2, undefined, undefined]),
    ).toStrictEqual([1, undefined, 2]);
  });

  it("ignores empty params", () => {
    expect(trimTrailingParams([])).toStrictEqual([]);
  });
});

describe("errorDetails", () => {
  it("returns error details when available", () => {
    const details = { details: "fake details" };
    expect(errorDetails(new JSONRPCError("fake error", 100, details))).toBe(
      details,
    );
  });

  it("returns undefined when missing error details", () => {
    expect(errorDetails(new JSONRPCError("fake error", 100))).toBe(undefined);
  });
});
