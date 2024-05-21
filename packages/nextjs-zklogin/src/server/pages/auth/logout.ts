/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextApiHandler } from "next";
import { withSession } from "../session.js";
import { methodDispatcher } from "../utils.js";

const postHandler: NextApiHandler = (req, res) => {
  req.session.destroy();
  res.json({});
};

const getHandler: NextApiHandler = (req, res) => {
  req.session.destroy();
  res.redirect("/");
};

/**
 * Implements the logout route.
 */
export default withSession(
  methodDispatcher({ POST: postHandler, GET: getHandler }),
);
