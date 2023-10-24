/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextApiHandler } from "next";
import { OidProvider, ZkLoginUserId } from "../../../user.js";
import {
  CurrentEpochProvider,
  SaltProvider,
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
  enableOidProvider: (
    provider: OidProvider
  ) => Promise<boolean> | boolean = () => true,
  allowUser: (user: ZkLoginUserId) => Promise<boolean> | boolean = () => true
): NextApiHandler {
  return withInternalErrorHandler(
    catchAllDispatcher({
      login: login(
        epochProvider,
        saltProvider,
        zkProofProvider,
        enableOidProvider,
        allowUser
      ),
      logout,
      me: me(epochProvider),
    })
  );
}
