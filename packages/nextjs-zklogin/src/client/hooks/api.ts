/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MutationFunction,
  QueryFunction,
  QueryFunctionContext,
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Struct, is, mask } from "superstruct";
import { AUTH_API_BASE } from "../../env.js";
import { ApiErrorBody } from "../../error.js";
import { ZkLoginRequest, ZkLoginUser } from "../../user.js";
import { HttpMethod } from "../../utils.js";

export class ApiError extends Error {
  status: number;
  error: ApiErrorBody;

  constructor(status: number, error: ApiErrorBody) {
    super(error.error);
    this.status = status;
    this.error = error;
  }
}

/**
 * Helper function to call a JSON API.
 */
export async function callJsonApi<T>({
  uri,
  body,
  method,
  resultSchema,
}: {
  uri: string | URL;
  body?: unknown;
  method?: HttpMethod;
  resultSchema?: Struct<T>;
}): Promise<T> {
  const resp = await fetch(uri, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const data: unknown = await resp.json();
  if (!resp.ok) {
    throw new ApiError(
      resp.status,
      is(data, ApiErrorBody) ? data : { error: JSON.stringify(data) },
    );
  }
  return resultSchema ? mask(data, resultSchema) : (data as T);
}

function apiQueryFn<T = unknown>(schema?: Struct<T>): QueryFunction<T> {
  return async ({ queryKey }: QueryFunctionContext) =>
    callJsonApi({
      uri: queryKey.at(-1) as string,
      resultSchema: schema,
    });
}

/**
 * Helper function to generate TanStack mutation functions for making HTTP API calls.
 */
export function apiMutationFn<T = unknown, P = unknown>({
  uri,
  body,
  method,
  resultSchema,
}: {
  uri: (params: P) => string;
  body?: (params: P) => unknown;
  method?: HttpMethod;
  resultSchema?: Struct<T>;
}): MutationFunction<T, P> {
  return async (params: P) =>
    callJsonApi({
      uri: uri(params),
      body: body ? body(params) : params,
      method: method ?? "POST",
      resultSchema,
    });
}

/**
 * React hook for fetching user info from the auth API.
 *
 * Uses TanStack query.
 */
export function useMe(): UseQueryResult<ZkLoginUser, ApiError> {
  return useQuery({
    queryKey: ["api", `${AUTH_API_BASE}/me`],
    queryFn: apiQueryFn(ZkLoginUser),
    retry: false,
  });
}

/**
 * React hook for issuing a login request to the auth API.
 *
 * Uses TanStack mutation.
 */
export function useLogin(): UseMutationResult<
  ZkLoginUser,
  ApiError,
  ZkLoginRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiMutationFn({
      uri: () => `${AUTH_API_BASE}/login`,
      resultSchema: ZkLoginUser,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["api", `${AUTH_API_BASE}/me`],
      });
    },
  });
}

/**
 * React hook for issuing a logout request to the auth API.
 *
 * Uses TanStack mutation. Alternatively, you can also redirect the user to the logout API route
 * (default at `/api/auth/logout`).
 */
export function useLogout(): UseMutationResult<unknown, ApiError> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiMutationFn({ uri: () => `${AUTH_API_BASE}/logout` }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["api", `${AUTH_API_BASE}/me`],
      });
    },
  });
}
