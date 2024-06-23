/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextApiHandler } from "next";
import { ApiErrorBody } from "../../error.js";
import { HttpMethod } from "../../utils.js";

const CATCH_ALL_API_SLUG_NAME = process.env.CATCH_ALL_API_SLUG_NAME ?? "api";

export function withInternalErrorHandler<T>(
  handler: NextApiHandler<T>,
): NextApiHandler<T | ApiErrorBody> {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (e) {
      console.error("Unhandled error", e);
      return res.status(500).json({ error: "Internal error" });
    }
  };
}

export function methodDispatcher(
  methodHandlers: Partial<Record<HttpMethod, NextApiHandler>>,
): NextApiHandler {
  return async (req, res) => {
    const handler = methodHandlers[req.method as HttpMethod];
    if (!handler) return res.status(405).json({ error: "Bad method" });
    return await handler(req, res);
  };
}

export function catchAllDispatcher(
  subPathHandlers: Partial<Record<string, NextApiHandler>>,
): NextApiHandler {
  return async (req, res) => {
    const slug = req.query[CATCH_ALL_API_SLUG_NAME];
    if (!Array.isArray(slug)) {
      throw new Error(
        `Catch all api route slug expected [...${CATCH_ALL_API_SLUG_NAME}]`,
      );
    }

    const handler = subPathHandlers[slug.join("/")];
    if (!handler) return res.status(404).json({ error: "Sub-path not found" });
    return await handler(req, res);
  };
}
