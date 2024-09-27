/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GasStationClient,
  KeyClient,
  WalletClient,
  createAptosClient,
} from "../../src/aptos/index.js";

// https://explorer.aptoslabs.com/account/0x08f91c1523658608e41e628b9a36790a19ec272a2c27084cf2acacbb45fc1643/modules/code/math?network=testnet
export const EXAMPLE_PACKAGE_ID =
  "0x8f91c1523658608e41e628b9a36790a19ec272a2c27084cf2acacbb45fc1643";

export function createAptos() {
  return createAptosClient(requireEnv("APTOS_NODE_ACCESS_KEY"));
}

export function createGasClient() {
  return new GasStationClient(requireEnv("APTOS_GAS_ACCESS_KEY"));
}

export function createKeyClient() {
  return new KeyClient(requireEnv("APTOS_WALLET_ACCESS_KEY"));
}

export function createWalletClient() {
  return new WalletClient(requireEnv("APTOS_WALLET_ACCESS_KEY"));
}

function requireEnv(env: string): string {
  const value = process.env[env];
  if (!value) throw new Error(`${env} not configured`);
  return value;
}
