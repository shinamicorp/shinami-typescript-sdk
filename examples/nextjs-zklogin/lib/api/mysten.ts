import { SuiClient } from "@mysten/sui/client";
import { SaltProvider, ZkProofProvider } from "@shinami/nextjs-zklogin/server";
import { SUI_NETWORK } from "../shared/sui";

const MYSTEN_SUI_NODE_URL = `https://fullnode.${SUI_NETWORK}.sui.io:443`;
const MYSTEN_SALT_SERVER_URL = "https://salt.api.mystenlabs.com/get_salt";
const MYSTEN_PROVER_URL =
  SUI_NETWORK === "mainnet"
    ? "https://prover.mystenlabs.com/v1"
    : "https://prover-dev.mystenlabs.com/v1";

/**
 * Mysten-operated Sui fullnode.
 */
export const mystenSui = new SuiClient({ url: MYSTEN_SUI_NODE_URL });

/**
 * Mysten-operated salt server.
 */
export const mystenSaltProvider: SaltProvider = async ({
  jwt,
  keyClaimName,
  subWallet,
}) => {
  if (keyClaimName !== "sub")
    throw new Error("Only 'sub' claim is supported by Mysten salt server");
  if (subWallet !== 0)
    throw new Error("Sub-wallets not supported by Mysten salt server");

  const resp = await fetch(MYSTEN_SALT_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: jwt,
    }),
  });

  if (resp.status !== 200) {
    console.error("Mysten salt server response", await resp.text());
    throw new Error(
      `Unexpected status from Mysten salt server: ${resp.status}`,
    );
  }

  return BigInt((await resp.json()).salt);
};

/**
 * Mysten-operated prover.
 */
export const mystenProver: ZkProofProvider = async ({
  jwt,
  ephemeralPublicKey,
  maxEpoch,
  jwtRandomness,
  salt,
  keyClaimName,
}) => {
  const resp = await fetch(MYSTEN_PROVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jwt,
      extendedEphemeralPublicKey: ephemeralPublicKey.toSuiPublicKey(),
      maxEpoch: maxEpoch.toString(),
      jwtRandomness: jwtRandomness.toString(),
      salt: salt.toString(),
      keyClaimName,
    }),
  });

  if (resp.status !== 200) {
    console.error("Mysten prover response", await resp.text());
    throw new Error(`Unexpected status from Mysten prover: ${resp.status}`);
  }

  return await resp.json();
};
