/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GasStationClient,
} from "../../src/aptos/index.js";

// https://explorer.movementnetwork.xyz/account/0x5f2312867bcfcefec959f2cedaed49ca670db2a56fcca99623c74bbc67408647/modules/code/math?network=bardock+testnet
export const EXAMPLE_PACKAGE_ID =
  "0x5f2312867bcfcefec959f2cedaed49ca670db2a56fcca99623c74bbc67408647";

export function createGasClient() {
  return new GasStationClient(requireEnv("MOVEMENT_GAS_ACCESS_KEY"));
}

function requireEnv(env: string): string {
  const value = process.env[env];
  if (!value) throw new Error(`${env} not configured`);
  return value;
}
