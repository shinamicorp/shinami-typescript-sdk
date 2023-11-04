/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Infer, integer, object, string } from "superstruct";
import { ShinamiRpcClient } from "./rpc.js";
import { base64ToBigInt } from "./utils.js";

const ZKWALLET_RPC_URL = "https://api.shinami.com/zkwallet/v1";

/**
 * Information that identifies a zkLogin user.
 */
export const ZkLoginUserId = object({
  iss: string(),
  aud: string(),
  keyClaimName: string(),
  keyClaimValue: string(),
});
export type ZkLoginUserId = Infer<typeof ZkLoginUserId>;

/**
 * zkLogin wallet info.
 */
export interface ZkLoginWallet {
  userId: ZkLoginUserId;
  subWallet: number;
  salt: bigint;
  address: string;
}

/**
 * zkLogin wallet response schema.
 */
const ZkLoginWalletResponse = object({
  userId: ZkLoginUserId,
  subWallet: integer(),
  salt: string(),
  address: string(),
});

/**
 * zkLogin wallet RPC client.
 */
export class ZkWalletClient extends ShinamiRpcClient {
  /**
   * @param accessKey Wallet access key.
   * @param url Optional URL override.
   */
  constructor(accessKey: string, url: string = ZKWALLET_RPC_URL) {
    super(accessKey, url);
  }

  /**
   * Retrieves a zkLogin wallet or creates a new one if necessary.
   * @param jwt A valid JWT signed by one of the supported OpenID providers.
   * @param keyClaimName The claim name in the JWT that identifies a particular user.
   * @param subWallet The sub-wallet id, which enables the same OpenID user to have more than one
   *    wallet addresses.
   * @returns The zkLogin proof for the given JWT.
   */
  async getOrCreateZkLoginWallet(
    jwt: string,
    keyClaimName?: string,
    subWallet?: number
  ): Promise<ZkLoginWallet> {
    const resp = await this.request(
      "shinami_zkw_getOrCreateZkLoginWallet",
      {
        jwt,
        keyClaimName,
        subWallet,
      },
      ZkLoginWalletResponse
    );
    return {
      userId: resp.userId,
      subWallet: resp.subWallet,
      salt: base64ToBigInt(resp.salt),
      address: resp.address,
    };
  }
}
