/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextApiHandler } from "next";
import {
  CurrentEpochProvider,
  OAuthApplications,
  SaltProvider,
  UserAuthorizer,
  ZkProofProvider,
} from "../../providers.js";
import { catchAllDispatcher, withInternalErrorHandler } from "../utils.js";
import { login } from "./login.js";
import logout from "./logout.js";
import me from "./me.js";

/**
 * Implements auth API routes, by default at `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
 *
 * To install this under another route, you must set env `NEXT_PUBLIC_AUTH_API_BASE`.
 *
 * @param epochProvider Function to fetch the current epoch number. Can also use a `SuiClient`.
 * @param saltProvider Function to fetch the wallet salt. Can also use a `ZkWalletClient`.
 * @param zkProofProvider Function to generate a zkProof. Can also use a `ZkProverClient`.
 * @param allowedApps OAuth application ids allowed for login.
 *    Should generally match the ids used on your login page.
 * @param authorizeUser Function that decides if an OpenID user is authorized to access your app.
 *    The user's JWT has already been verified by this point, but you can impose custom rules,
 *    potentially from consulting another data source. You can also return any info to enrich the
 *    user's auth context, which can be consumed by your frontend pages or API routes.
 *    Returning `undefine` will reject the login request.
 * @returns
 */
export function authHandler(
  epochProvider: CurrentEpochProvider,
  saltProvider: SaltProvider,
  zkProofProvider: ZkProofProvider,
  allowedApps: OAuthApplications,
  authorizeUser: UserAuthorizer = () => ({}),
): NextApiHandler {
  return withInternalErrorHandler(
    catchAllDispatcher({
      login: login(
        epochProvider,
        saltProvider,
        zkProofProvider,
        allowedApps,
        authorizeUser,
      ),
      logout,
      me: me(epochProvider),
    }),
  );
}
