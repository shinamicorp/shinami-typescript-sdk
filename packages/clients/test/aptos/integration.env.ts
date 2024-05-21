/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { GasStationClient } from "../../src/aptos/index.js";

// https://explorer.aptoslabs.com/account/0x08f91c1523658608e41e628b9a36790a19ec272a2c27084cf2acacbb45fc1643/modules/code/math?network=testnet
export const EXAMPLE_PACKAGE_ID =
  "0x8f91c1523658608e41e628b9a36790a19ec272a2c27084cf2acacbb45fc1643";

export function createAptos() {
  return new Aptos(new AptosConfig({ network: Network.TESTNET }));
}

export function createGasClient() {
  return new GasStationClient(requireEnv("APTOS_GAS_ACCESS_KEY"));
}

function requireEnv(env: string): string {
  const value = process.env[env];
  if (!value) throw new Error(`${env} not configured`);
  return value;
}
