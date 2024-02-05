/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IronSessionOptions } from "iron-session";
import { withIronSessionApiRoute } from "iron-session/next";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { ApiErrorBody } from "../../error.js";
import { ZkLoginUser } from "../../user.js";
import { throwExpression } from "../../utils.js";
import { CurrentEpochProvider, getCurrentEpoch } from "../providers.js";
import { withInternalErrorHandler } from "./utils.js";

const IRON_SESSION_SECRET =
  process.env.IRON_SESSION_SECRET ??
  throwExpression(new Error("IRON_SESSION_SECRET not configured"));

declare module "iron-session" {
  interface IronSessionData {
    user?: ZkLoginUser;
  }
}

export const sessionConfig: IronSessionOptions = {
  cookieName: "iron_session",
  password: IRON_SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

/**
 * Higher-order handler for augmenting the wrapped handler with session state.
 *
 * The session state is managed using iron-session, and this is just a thin wrapper on top of
 * `withIronSessionApiRoute`.
 */
export function withSession<T>(handler: NextApiHandler<T>): NextApiHandler<T> {
  return withIronSessionApiRoute(handler, sessionConfig);
}

/**
 * Higher-order handler for implementing auth-protected API routes.
 *
 * Requests would result in HTTP 401 if the user doesn't have an active session.
 */
export function withZkLoginUserRequired<TRes, TAuth = unknown>(
  epochProvider: CurrentEpochProvider,
  handler: (
    req: NextApiRequest,
    res: NextApiResponse<TRes>,
    user: ZkLoginUser<TAuth>
  ) => unknown | Promise<unknown>
): NextApiHandler<TRes | ApiErrorBody> {
  return withInternalErrorHandler(
    withSession<TRes | ApiErrorBody>(async (req, res) => {
      if (!req.session.user)
        return res.status(401).json({ error: "Unauthorized" });

      const { epoch } = await getCurrentEpoch(epochProvider);
      if (epoch > req.session.user.maxEpoch) {
        req.session.destroy();
        return res.status(401).json({ error: "maxEpoch expired" });
      }

      return handler(req, res, req.session.user as ZkLoginUser<TAuth>);
    })
  );
}
