/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export function first<T>(value?: T | T[]): T | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) value = [value];
  return value[0];
}

export function throwExpression(error: unknown): never {
  throw error;
}
