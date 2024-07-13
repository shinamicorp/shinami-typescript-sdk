/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextApiHandler } from "next";
import { intersection, record, string, type, validate } from "superstruct";
import { methodDispatcher } from "../utils.js";

const CallbackData = intersection([
  type({
    state: string(),
  }),
  record(string(), string()),
]);

const postHandler: NextApiHandler = (req, res) => {
  const [error, body] = validate(req.body, CallbackData);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const callback = new URLSearchParams(body.state).get("callback");
  if (!callback) {
    res.status(400).json({ error: "Missing callback from state" });
    return;
  }

  res.redirect(303, `${callback}#${new URLSearchParams(body).toString()}`);
};

/**
 * This route translates an HTTP POST callback from Sign in with Apple to a client-side callback
 * where parameters are passed through URL fragment, same as the other providers.
 */
export const apple = methodDispatcher({ POST: postHandler });
