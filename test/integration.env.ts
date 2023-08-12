/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GasStationClient,
  KeyClient,
  WalletClient,
  createSuiClient as createSuiClientImpl,
} from "../src/index.js";

// This is published to Testnet.
export const EXAMPLE_PACKAGE_ID =
  "0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975";

export function createSuiClient() {
  return createSuiClientImpl(requireEnv("NODE_ACCESS_KEY"));
}

export function createGasClient() {
  return new GasStationClient(requireEnv("GAS_ACCESS_KEY"));
}

export function createWalletClient() {
  return new WalletClient(requireEnv("WALLET_ACCESS_KEY"));
}

export function createKeyClient() {
  return new KeyClient(requireEnv("WALLET_ACCESS_KEY"));
}

function requireEnv(env: string): string {
  const value = process.env[env];
  if (!value) throw new Error(`${env} not configured`);
  return value;
}
