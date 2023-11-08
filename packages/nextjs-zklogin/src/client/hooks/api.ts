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
import { Struct, mask } from "superstruct";
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

function apiQueryFn<T = unknown>(schema?: Struct<T>): QueryFunction<T> {
  return async ({ queryKey }: QueryFunctionContext) => {
    const uri = queryKey.at(-1) as string;
    const resp = await fetch(uri, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await resp.json();
    if (!resp.ok) throw new ApiError(resp.status, data);

    return schema ? mask(data, schema) : data;
  };
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
  const _body = body ?? ((params) => params);
  const _method = method ?? "POST";

  return async (params: P) => {
    const resp = await fetch(uri(params), {
      method: _method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(_body(params)),
    });
    const data = await resp.json();
    if (!resp.ok) throw new ApiError(resp.status, data);
    return resultSchema ? mask(data, resultSchema) : data;
  };
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
      queryClient.invalidateQueries({
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
      queryClient.invalidateQueries({
        queryKey: ["api", `${AUTH_API_BASE}/me`],
      });
    },
  });
}
