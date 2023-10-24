/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SuiClient,
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui.js/client";
import { GasStationClient } from "@shinami/clients";
import { NextApiHandler, NextApiRequest } from "next";
import { validate } from "superstruct";
import { ApiErrorBody } from "../../error.js";
import { PreparedTransactionBytes, SignedTransactionBytes } from "../../tx.js";
import { ZkLoginUser, assembleZkLoginSignature } from "../../user.js";
import { withZkLoginUserRequired } from "./session.js";
import { catchAllDispatcher, methodDispatcher } from "./utils.js";

export interface GaslessTransactionBytesWithBudget {
  gaslessTxBytes: string;
  gasBudget: number;
}

export type GaslessTransactionBytesBuilder = (
  req: NextApiRequest,
  user: ZkLoginUser
) =>
  | Promise<GaslessTransactionBytesWithBudget>
  | GaslessTransactionBytesWithBudget;

export type TransactionBytesBuilder = (
  req: NextApiRequest,
  user: ZkLoginUser
) => Promise<string> | string;

export type TransactionResponseParser<T = unknown> = (
  req: NextApiRequest,
  txRes: SuiTransactionBlockResponse,
  user: ZkLoginUser
) => Promise<T> | T;

export class InvalidRequest extends Error {}

function txHandler(
  buildTxBytes: TransactionBytesBuilder
): NextApiHandler<PreparedTransactionBytes | ApiErrorBody> {
  return methodDispatcher({
    POST: async (req, res) => {
      const user = req.session.user!;
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

function sponsoredTxHandler(
  gas: GasStationClient,
  buildGaslessTxBytes: GaslessTransactionBytesBuilder
): NextApiHandler<PreparedTransactionBytes | ApiErrorBody> {
  return methodDispatcher({
    POST: async (req, res) => {
      const user = req.session.user!;
      let tx;
      try {
        tx = await buildGaslessTxBytes(req, user);
      } catch (e) {
        if (!(e instanceof InvalidRequest)) throw e;
        return res.status(400).json({ error: e.message });
      }

      const { txBytes, signature } = await gas.sponsorTransactionBlock(
        tx.gaslessTxBytes,
        user.wallet,
        tx.gasBudget
      );
      res.json({ txBytes, gasSignature: signature });
    },
  });
}

function execHandler<T = unknown>(
  sui: SuiClient,
  parseTxRes: TransactionResponseParser<T>,
  txOptions: SuiTransactionBlockResponseOptions = {}
): NextApiHandler<T | ApiErrorBody> {
  return methodDispatcher({
    POST: async (req, res) => {
      const [error, body] = validate(req.body, SignedTransactionBytes);
      if (error) return res.status(400).json({ error: error.message });

      const user = req.session.user!;
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

export function zkLoginTxExecHandler(
  sui: SuiClient,
  buildTxBytes: TransactionBytesBuilder,
  parseTxRes: TransactionResponseParser,
  txOptions: SuiTransactionBlockResponseOptions = {}
): NextApiHandler {
  return withZkLoginUserRequired(
    sui,
    catchAllDispatcher({
      tx: txHandler(buildTxBytes),
      exec: execHandler(sui, parseTxRes, txOptions),
    })
  );
}

export function zkLoginSponsoredTxExecHandler(
  sui: SuiClient,
  gas: GasStationClient,
  buildGaslessTxBytes: GaslessTransactionBytesBuilder,
  parseTxRes: TransactionResponseParser,
  txOptions: SuiTransactionBlockResponseOptions = {}
): NextApiHandler {
  return withZkLoginUserRequired(
    sui,
    catchAllDispatcher({
      tx: sponsoredTxHandler(gas, buildGaslessTxBytes),
      exec: execHandler(sui, parseTxRes, txOptions),
    })
  );
}
