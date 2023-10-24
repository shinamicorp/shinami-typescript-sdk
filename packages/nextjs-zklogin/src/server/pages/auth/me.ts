/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextApiHandler } from "next";
import { ZkLoginUser } from "../../../user.js";
import { CurrentEpochProvider } from "../../providers.js";
import { withZkLoginUserRequired } from "../session.js";
import { methodDispatcher } from "../utils.js";

const handler: NextApiHandler<ZkLoginUser> = (req, res) => {
  res.json(req.session.user!);
};

export default function me(
  epochProvider: CurrentEpochProvider
): NextApiHandler {
  return withZkLoginUserRequired(
    epochProvider,
    methodDispatcher({
      GET: handler,
    })
  );
}
