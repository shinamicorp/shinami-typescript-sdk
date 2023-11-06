/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextApiHandler } from "next";
import {
  CurrentEpochProvider,
  OpenIdProviderFilter,
  SaltProvider,
  UserAuthorizer,
  ZkProofProvider,
} from "../../providers.js";
import { catchAllDispatcher, withInternalErrorHandler } from "../utils.js";
import { login } from "./login.js";
import logout from "./logout.js";
import me from "./me.js";

export function authHandler(
  epochProvider: CurrentEpochProvider,
  saltProvider: SaltProvider,
  zkProofProvider: ZkProofProvider,
  enableOidProvider: OpenIdProviderFilter = () => true,
  authorizeUser: UserAuthorizer = () => ({})
): NextApiHandler {
  return withInternalErrorHandler(
    catchAllDispatcher({
      login: login(
        epochProvider,
        saltProvider,
        zkProofProvider,
        enableOidProvider,
        authorizeUser
      ),
      logout,
      me: me(epochProvider),
    })
  );
}
