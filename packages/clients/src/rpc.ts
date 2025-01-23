/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Client,
  HTTPTransport,
  JSONRPCError,
  RequestManager,
} from "@open-rpc/client-js";
import { Infer, Struct, mask, object, string, validate } from "superstruct";

/**
 * Base class for all Shinami JSON RPC clients.
 */
export class ShinamiRpcClient {
  readonly client: Client;

  /**
   * @param accessKey Access key for the service.
   * @param url Service RPC URL.
   */
  constructor(accessKey: string, url: string) {
    this.client = new Client(
      new RequestManager([
        new HTTPTransport(url, {
          headers: {
            "X-API-Key": accessKey,
          },
        }),
      ]),
    );
  }

  /**
   * Issues an RPC request.
   * @param method Request method.
   * @param params Optional request params. Both by name and by position are supported.
   * @param schema Optional result schema. Will validate the result if specified.
   * @returns The RPC result.
   */
  async request<T>(
    method: string,
    params?: unknown[] | object,
    schema?: Struct<T>,
  ): Promise<T> {
    const result: unknown = await this.client.request({ method, params });
    if (!schema) return result as T;
    return mask(result, schema);
  }

  /**
   * Discovers available RPC methods from the server.
   * @returns OpenRPC spec implemented by the server.
   */
  rpcDiscover(): Promise<object> {
    console.log("arbitrary line to force codecov to run");
    return this.request("rpc.discover");
  }
}

/**
 * Trims all tailing `undefined` values from `params` array.
 * @param params Array of request params.
 * @returns Trimmed params.
 */
export function trimTrailingParams(
  params: readonly unknown[],
): readonly unknown[] {
  let end = params.length;
  while (end > 0) {
    if (params[end - 1] !== undefined) break;
    end--;
  }
  return end === params.length ? params : params.slice(0, end);
}

/**
 * Schema for RPC error details.
 */
export const ErrorDetails = object({
  details: string(),
});
export type ErrorDetails = Infer<typeof ErrorDetails>;

/**
 * Extracts error details from an RPC error if available.
 * @param error JSON RPC error.
 * @returns Error details if available.
 */
export function errorDetails(error: JSONRPCError): ErrorDetails | undefined {
  return validate(error.data, ErrorDetails, { mask: true })[1];
}
