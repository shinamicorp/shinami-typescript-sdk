/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PublicKey } from "@mysten/sui/cryptography";
import { Infer, object, type } from "superstruct";
import { ShinamiRpcClient, trimTrailingParams } from "../rpc.js";
import { bigIntToBase64 } from "./utils.js";
import { ZkProverRpcUrls } from "./endpoints.js";
import { inferRegionalValueFromAccessKey } from "../region.js";

/**
 * Result schema for createZkLoginProof.
 */
export const CreateZkLoginProofResult = object({
  /**
   * zkLogin proof.
   */
  zkProof: type({}),
});
export type CreateZkLoginProofResult = Infer<typeof CreateZkLoginProofResult>;

/**
 * zkLogin prover RPC client.
 */
export class ZkProverClient extends ShinamiRpcClient {
  /**
   * @param accessKey Wallet access key.
   * @param url Optional URL override.
   */
  constructor(
    accessKey: string,
    url: string = inferRegionalValueFromAccessKey(
      accessKey,
      ZkProverRpcUrls,
      (zkProverRpcUrls) => zkProverRpcUrls.us1,
    ),
  ) {
    super(accessKey, url);
  }

  /**
   * Creates a zkLogin proof for the given JWT.
   * @param jwt A valid JWT signed by one of the supported OpenID providers.
   * @param maxEpoch The max epoch used to prepare the JWT nonce.
   * @param ephemeralPublicKey The ephemeral public key used to prepare the JWT nonce.
   * @param jwtRandomness The random bytes used to prepare the JWT nonce.
   * @param salt The zkLogin wallet salt.
   * @param keyClaimName The claim name in the JWT that identifies a particular user.
   * @returns The zkLogin proof for the given JWT.
   */
  createZkLoginProof(
    jwt: string,
    maxEpoch: number,
    ephemeralPublicKey: PublicKey,
    jwtRandomness: bigint,
    salt: bigint,
    keyClaimName?: string,
  ): Promise<CreateZkLoginProofResult> {
    return this.request(
      "shinami_zkp_createZkLoginProof",
      trimTrailingParams([
        jwt,
        maxEpoch.toString(),
        ephemeralPublicKey.toSuiPublicKey(),
        bigIntToBase64(jwtRandomness),
        bigIntToBase64(salt),
        keyClaimName,
      ]),
      CreateZkLoginProofResult,
    );
  }
}
