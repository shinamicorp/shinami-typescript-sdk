/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import {
  GasStationClient,
  KeyClient,
  WalletClient,
} from "../../src/aptos/index.js";

// https://explorer.aptoslabs.com/account/0x08f91c1523658608e41e628b9a36790a19ec272a2c27084cf2acacbb45fc1643/modules/code/math?network=testnet
export const APTOS_EXAMPLE_PACKAGE_ID =
  "0x8f91c1523658608e41e628b9a36790a19ec272a2c27084cf2acacbb45fc1643";

// https://explorer.movementnetwork.xyz/account/0x5f2312867bcfcefec959f2cedaed49ca670db2a56fcca99623c74bbc67408647/modules/code/math?network=bardock+testnet
export const MOVEMENT_EXAMPLE_PACKAGE_ID =
  "0x5f2312867bcfcefec959f2cedaed49ca670db2a56fcca99623c74bbc67408647";

export function createAptos() {
  const config = new AptosConfig({
    network: Network.TESTNET,
    fullnode: "https://fullnode.testnet.aptoslabs.com/v1",
  });
  return new Aptos(config);
}

export function createMovement() {
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1",
  });
  return new Aptos(config);
}

export function createAptosGasClient() {
  return new GasStationClient(requireEnv("APTOS_GAS_ACCESS_KEY"));
}

export function createMovementGasClient() {
  return new GasStationClient(requireEnv("MOVEMENT_GAS_ACCESS_KEY"));
}

export function createAptosKeyClient() {
  return new KeyClient(requireEnv("APTOS_WALLET_ACCESS_KEY"));
}

export function createMovementKeyClient() {
  return new KeyClient(requireEnv("MOVEMENT_WALLET_ACCESS_KEY"));
}

export function createAptosWalletClient() {
  return new WalletClient(requireEnv("APTOS_WALLET_ACCESS_KEY"));
}

export function createMovementWalletClient() {
  return new WalletClient(requireEnv("MOVEMENT_WALLET_ACCESS_KEY"));
}

function requireEnv(env: string): string {
  const value = process.env[env];
  if (!value) throw new Error(`${env} not configured`);
  return value;
}
