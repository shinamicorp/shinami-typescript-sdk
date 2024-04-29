/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from "./rpc.js";

export {
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  Fund,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  GasStationClient,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  SponsoredTransaction,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  SponsoredTransactionStatus,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  buildGaslessTransactionBytes,
} from "./sui/gas.js";

export {
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  createSuiClient,
} from "./sui/sui.js";

export {
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  BULLSHARK_QUEST_BENEFICIARY_GRAPH_ID_MAINNET,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  KeyClient,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  ShinamiWalletSigner,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  SignTransactionResult,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  WalletClient,
} from "./sui/wallet.js";

export {
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  CreateZkLoginProofResult,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  ZkProverClient,
} from "./sui/zkprover.js";

export {
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  ZkLoginUserId,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  ZkLoginWallet,
  /**
   * @deprecated since 0.8.0. Import from "@shinami/clients/sui" instead.
   */
  ZkWalletClient,
} from "./sui/zkwallet.js";
