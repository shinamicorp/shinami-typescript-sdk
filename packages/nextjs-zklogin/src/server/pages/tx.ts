/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SuiClient,
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui/client";
import { GasStationClient, GaslessTransaction } from "@shinami/clients/sui";
import { NextApiHandler, NextApiRequest } from "next";
import { validate } from "superstruct";
import { ApiErrorBody } from "../../error.js";
import { PreparedTransactionBytes, SignedTransactionBytes } from "../../tx.js";
import { ZkLoginUser, assembleZkLoginSignature } from "../../user.js";
import { withZkLoginUserRequired } from "./session.js";
import { catchAllDispatcher, methodDispatcher } from "./utils.js";

export type GaslessTransactionBuilder<TAuth = unknown> = (
  req: NextApiRequest,
  user: ZkLoginUser<TAuth>,
) =>
  | Promise<Omit<GaslessTransaction, "sender">>
  | Omit<GaslessTransaction, "sender">;

export type TransactionBytesBuilder<TAuth = unknown> = (
  req: NextApiRequest,
  user: ZkLoginUser<TAuth>,
) => Promise<string> | string;

export type TransactionResponseParser<TAuth = unknown, TRes = unknown> = (
  req: NextApiRequest,
  txRes: SuiTransactionBlockResponse,
  user: ZkLoginUser<TAuth>,
) => Promise<TRes> | TRes;

export class InvalidRequest extends Error {}

function txHandler<TAuth = unknown>(
  buildTxBytes: TransactionBytesBuilder<TAuth>,
): NextApiHandler<PreparedTransactionBytes | ApiErrorBody> {
  return methodDispatcher({
    POST: async (req, res) => {
      const user = req.session.user! as ZkLoginUser<TAuth>;
      let txBase64;
      try {
        txBase64 = await buildTxBytes(req, user);
      } catch (e) {
        if (!(e instanceof InvalidRequest)) throw e;
        return res.status(400).json({ error: e.message });
      }
      res.json({ txBytes: txBase64 });
    },
  });
}

function sponsoredTxHandler<TAuth = unknown>(
  gas: GasStationClient,
  buildGaslessTx: GaslessTransactionBuilder<TAuth>,
): NextApiHandler<PreparedTransactionBytes | ApiErrorBody> {
  return methodDispatcher({
    POST: async (req, res) => {
      const user = req.session.user! as ZkLoginUser<TAuth>;
      let tx;
      try {
        tx = await buildGaslessTx(req, user);
      } catch (e) {
        if (!(e instanceof InvalidRequest)) throw e;
        return res.status(400).json({ error: e.message });
      }

      const { txBytes, signature } = await gas.sponsorTransaction({
        ...tx,
        sender: user.wallet,
      });
      res.json({ txBytes, gasSignature: signature });
    },
  });
}

function execHandler<TAuth = unknown, TRes = unknown>(
  sui: SuiClient,
  parseTxRes: TransactionResponseParser<TAuth, TRes>,
  txOptions: SuiTransactionBlockResponseOptions = {},
): NextApiHandler<TRes | ApiErrorBody> {
  return methodDispatcher({
    POST: async (req, res) => {
      const [error, body] = validate(req.body, SignedTransactionBytes, {
        mask: true,
      });
      if (error) return res.status(400).json({ error: error.message });

      const user = req.session.user! as ZkLoginUser<TAuth>;
      const zkSignature = assembleZkLoginSignature(user, body.signature);

      const txRes = await sui.executeTransactionBlock({
        transactionBlock: body.txBytes,
        signature: body.gasSignature
          ? [zkSignature, body.gasSignature]
          : zkSignature,
        options: { ...txOptions, showEffects: true },
      });

      if (txRes.effects?.status.status !== "success") {
        console.error("Tx execution failed", txRes);
        return res.status(500).json({
          error: `Tx execution failed: ${txRes.effects?.status.error}`,
        });
      }

      res.json(await parseTxRes(req, txRes, user));
    },
  });
}

/**
 * Implements API routes for building and executing a Sui transaction.
 *
 * Two routes are implemented under the hood:
 * - [base_route]/tx for building the transaction.
 * - [base_route]/exec for executing the transaction after signed by frontend, and parsing the
 *   transaction response.
 *
 * @param sui `SuiClient` for transaction building and execution.
 * @param buildTxBytes Function to build a transaction (encoded in Base64).
 * @param parseTxRes Function to parse the transaction response.
 * @param txOptions Transaction response options.
 * @returns A Next.js API route handler.
 */
export function zkLoginTxExecHandler<TAuth = unknown, TRes = unknown>(
  sui: SuiClient,
  buildTxBytes: TransactionBytesBuilder<TAuth>,
  parseTxRes: TransactionResponseParser<TAuth, TRes>,
  txOptions: SuiTransactionBlockResponseOptions = {},
): NextApiHandler {
  return withZkLoginUserRequired(
    sui,
    catchAllDispatcher({
      tx: txHandler(buildTxBytes),
      exec: execHandler(sui, parseTxRes, txOptions),
    }),
  );
}

/**
 * Implements API routes for building, sponsoring, and executing a Sui transaction.
 *
 * Two routes are implemented under the hood:
 * - [base_route]/tx for building and sponsoring the transaction.
 * - [base_route]/exec for executing the transaction after signed by frontend, and parsing the
 *   transaction response.
 *
 * @param sui `SuiClient` for transaction building and execution.
 * @param gas `GasStationClient` for sponsoring transaction.
 * @param buildGaslessTx Function to build a gasless transaction.
 * @param parseTxRes Function to parse the transaction response.
 * @param txOptions Transaction response options.
 * @returns A Next.js API route handler.
 */
export function zkLoginSponsoredTxExecHandler<TAuth = unknown, TRes = unknown>(
  sui: SuiClient,
  gas: GasStationClient,
  buildGaslessTx: GaslessTransactionBuilder<TAuth>,
  parseTxRes: TransactionResponseParser<TAuth, TRes>,
  txOptions: SuiTransactionBlockResponseOptions = {},
): NextApiHandler {
  return withZkLoginUserRequired(
    sui,
    catchAllDispatcher({
      tx: sponsoredTxHandler(gas, buildGaslessTx),
      exec: execHandler(sui, parseTxRes, txOptions),
    }),
  );
}
