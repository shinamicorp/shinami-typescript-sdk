/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base route for auth APIs.
 *
 * Defaults to `/api/auth`. Customizable through env `NEXT_PUBLIC_AUTH_API_BASE`.
 */
export const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_BASE ?? "/api/auth";

/**
 * Login page path.
 *
 * Defaults to `/auth/login`. Customizable through env `NEXT_PUBLIC_LOGIN_PAGE_PATH`.
 */
export const LOGIN_PAGE_PATH =
  process.env.NEXT_PUBLIC_LOGIN_PAGE_PATH ?? "/auth/login";
