# Shinami Clients SDK

[![npm version](https://badge.fury.io/js/@shinami%2Fclients.svg)](https://badge.fury.io/js/@shinami%2Fclients)

TypeScript clients for [Shinami](https://www.shinami.com/) services.

For [Sui](https://sui.io/):

- [Node service](#node-service-sui)
- [Gas station](#gas-station-sui)
- [Invisible wallet](#invisible-wallet-sui)
- [zkLogin wallet](#zklogin-wallet-sui)

For [Aptos](https://aptos.dev/):

- [Gas station](#gas-station-aptos)
- [Invisible wallet](#invisible-wallet-aptos)

## Install

```console
$ npm install @shinami/clients
```

To develop against a supported blockchain, you will also need to install their respective SDK:

```shell
# For Sui
npm install @mysten/sui

# For Aptos
npm install @aptos-labs/ts-sdk
```

## Usage

### Node service (Sui)

To create a Sui RPC client:

```ts
import { createSuiClient } from "@shinami/clients/sui";

// Obtain NODE_ACCESS_KEY from your Shinami web portal.
const sui = createSuiClient(NODE_ACCESS_KEY);
```

The returned `sui` object is a [SuiClient](https://github.com/MystenLabs/sui/blob/3dacfa02ab67469f5d5a42aa6146b34bffbf7008/sdk/typescript/src/client/client.ts#L91) configured to use Shinami's node service.
It supports both HTTP JSON RPC requests as well as WebSocket subscriptions.

**Note that `NODE_ACCESS_KEY` determines which Sui network later operations are targeting.**

### Gas station (Sui)

**Note that gas station should be integrated from your service backend.**
This is so you don't leak your `GAS_ACCESS_KEY` to your end users, and to allow you to control whose and what transactions to sponsor.

To use gas station with a local signer:

```ts
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/sui/utils";
import {
  GasStationClient,
  buildGaslessTransaction,
  createSuiClient,
} from "@shinami/clients/sui";

// Obtain NODE_ACCESS_KEY and GAS_ACCESS_KEY from your Shinami web portal.
// They MUST be associated with the same network.
const sui = createSuiClient(NODE_ACCESS_KEY);
const gas = new GasStationClient(GAS_ACCESS_KEY);

// You'll want to persist the key pair instead of always creating new ones.
const keypair = new Ed25519Keypair();

const gaslessTx = await buildGaslessTransaction((txb) => {
  // Program your Transaction.
  txb.moveCall({
    target: `${EXAMPLE_PACKAGE_ID}::math::add`,
    arguments: [txb.pure.u64(1), txb.pure.u64(2)],
  });

  // Sender is required for sponsorship.
  // You don't need to set gas payment.
  txb.setSender(keypair.toSuiAddress());
});

// Request gas sponsorship.
const { txBytes, signature: gasSignature } =
  await gas.sponsorTransaction(gaslessTx);

// Sign the sponsored tx.
const { signature } = await keypair.signTransaction(fromB64(txBytes));

// Execute the sponsored & signed tx.
const txResp = await sui.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [signature, gasSignature],
});
```

### Invisible wallet (Sui)

To use the invisible wallet as a signer for a regular (non-sponsored) transaction:

```ts
import { Transaction } from "@mysten/sui/transactions";
import {
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
  createSuiClient,
} from "@shinami/clients/sui";

// Obtain NODE_ACCESS_KEY and WALLET_ACCESS_KEY from your Shinami web portal.
const sui = createSuiClient(NODE_ACCESS_KEY);
const key = new KeyClient(WALLET_ACCESS_KEY);
const wal = new WalletClient(WALLET_ACCESS_KEY);

// WALLET_SECRET MUST be used consistently with this wallet id.
// You are responsible for safe-keeping the (walletId, secret) pair.
// Shinami cannot recover it for you.
const signer = new ShinamiWalletSigner("my_wallet_id", wal, WALLET_SECRET, key);

// Program your Transaction.
const txb = new Transaction();
txb.moveCall({
  target: `${EXAMPLE_PACKAGE_ID}::math::add`,
  arguments: [txb.pure.u64(1), txb.pure.u64(2)],
});
txb.setSender(await signer.getAddress(true /* autoCreate */));
txb.setGasBudget(5_000_000);
// Your invisible wallet MUST have sufficient gas for this to succeed.
const txBytes = await txb.build({ client: sui });

// Sign tx with invisible wallet.
const { signature } = await signer.signTransaction(txBytes);

// Execute the signed tx.
const txResp = await sui.executeTransactionBlock({
  transactionBlock: txBytes,
  signature,
});
```

To use the invisible wallet to execute a gasless transaction, which seamlessly integrates with Shinami node service and gas station:

```ts
import {
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
  buildGaslessTransaction,
  createSuiClient,
} from "@shinami/clients/sui";

// Obtain SUPER_ACCESS_KEY from your Shinami web portal.
// It MUST be authorized for all of these services:
// - Node service
// - Gas station
// - Wallet service
const sui = createSuiClient(SUPER_ACCESS_KEY);
const key = new KeyClient(SUPER_ACCESS_KEY);
const wal = new WalletClient(SUPER_ACCESS_KEY);

// WALLET_SECRET MUST be used consistently with this wallet id.
// You are responsible for safe-keeping the (walletId, secret) pair.
// Shinami cannot recover it for you.
const signer = new ShinamiWalletSigner("my_wallet_id", wal, WALLET_SECRET, key);

// Safe to do if unsure about the wallet's existence.
await signer.tryCreate();

const gaslessTx = await buildGaslessTransaction((txb) => {
  // Program your Transaction.
  // You don't need to set sender or gas payment when executing from invisible wallet.
  txb.moveCall({
    target: `${EXAMPLE_PACKAGE_ID}::math::add`,
    arguments: [txb.pure.u64(1), txb.pure.u64(2)],
  });
});

// Execute the gasless tx using your invisible wallet.
const txResp = await signer.executeGaslessTransaction(gaslessTx);
```

#### Beneficiary graph API

Apps using Shinami invisible wallets can participate in [Bullshark Quests](https://quests.mystenlabs.com/) by allowing users to link their invisible wallets with self-custody wallets that own Bullshark NFTs, through the use of [beneficiary graph](https://github.com/shinamicorp/account-graph).

```ts
import {
  EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET,
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
} from "@shinami/clients/sui";

// Obtain SUPER_ACCESS_KEY from your Shinami web portal.
// It MUST be authorized for all of these services:
// - Node service
// - Gas station
// - Wallet service
const key = new KeyClient(SUPER_ACCESS_KEY);
const wal = new WalletClient(SUPER_ACCESS_KEY);

// WALLET_SECRET MUST be used consistently with this wallet id.
// You are responsible for safe-keeping the (walletId, secret) pair.
// Shinami cannot recover it for you.
const signer = new ShinamiWalletSigner("my_wallet_id", wal, WALLET_SECRET, key);

// Safe to do if unsure about the wallet's existence.
await signer.tryCreate();

// Use BULLSHARK_QUEST_BENEFICIARY_GRAPH_ID_MAINNET for Mainnet.
const graphId = EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET;

const txDigest = await signer.setBeneficiary(
  graphId,
  // Replace with user's actual wallet address that owns the Bullshark.
  "0x1234",
);

// This should return the address we just set.
const beneficiary = await signer.getBeneficiary(graphId);
```

### zkLogin wallet (Sui)

You can use Shinami's zkLogin wallet services as the salt provider and zkProver in your [zkLogin](https://docs.sui.io/concepts/cryptography/zklogin) implementation.

```ts
import { ZkProverClient, ZkWalletClient } from "@shinami/clients/sui";

// Obtain WALLET_ACCESS_KEY from your Shinami web portal.
const zkw = new ZkWalletClient(WALLET_ACCESS_KEY);
const zkp = new ZkProverClient(WALLET_ACCESS_KEY);

// Prepare a nonce according to the zkLogin requirements.
// Obtain a valid jwt with that nonce from a supported OpenID provider.

// Get zkLogin wallet salt.
const { salt, address } = await zkw.getOrCreateZkLoginWallet(jwt);

// Create a zkProof.
const { zkProof } = await zkp.createZkLoginProof(
  jwt,
  maxEpoch,
  ephemeralPublicKey,
  jwtRandomness,
  salt,
);

// Now you can sign transactions with ephemeralPrivateKey, and assemble the zkLogin signature
// using zkProof.
```

### Gas station (Aptos)

**Note that gas station should be integrated from your service backend.**
This is so you don't leak your `GAS_ACCESS_KEY` to your end users, and to allow you to control whose and what transactions to sponsor.

To use gas station with a local signer:

```ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { GasStationClient } from "@shinami/clients/aptos";

// Create your Aptos client targeting the desired network.
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

// Obtain GAS_ACCESS_KEY from your Shinami web portal.
// It MUST be associated with the same Aptos network as above.
const gas = new GasStationClient(GAS_ACCESS_KEY);

// Because we are using sponsored transaction, this account doesn't have to
// exist on-chain beforehand. It'll be created as part of the first transaction.
// In practice, you'll likely want to persist the account key as opposed to
// always generating new ones.
const account = Account.generate({
  scheme: SigningSchemeInput.Ed25519,
});

// Build a transaction as you normally would, but with fee payer placeholder.
const transaction = await aptos.transaction.build.simple({
  sender: account.accountAddress,
  data: {
    function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
    functionArguments: [1, 2],
  },
  withFeePayer: true,
});

// Get it sponsored.
const feePayerSig = await gas.sponsorTransaction(transaction);

// Sign the sponsored transaction as usual.
const senderSig = aptos.transaction.sign({
  signer: account,
  transaction,
});

// Submit the signed transaction with fee payer signature.
const pending = await aptos.transaction.submit.simple({
  transaction,
  senderAuthenticator: senderSig,
  feePayerAuthenticator: feePayerSig,
});

// Wait for it to be committed on-chain.
const committed = await aptos.transaction.waitForTransaction({
  transactionHash: pending.hash,
});
```

### Invisible wallet (Aptos)

To use the invisible wallet as a signer for a regular (non-sponsored) transaction:

```ts
import { 
  Aptos, 
  AptosConfig, 
  Network, 
  AccountAddress, 
  AccountAuthenticator, 
  AccountAuthenticatorEd25519 
} from "@aptos-labs/ts-sdk";
import {
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
} from "@shinami/clients/aptos";

// Create your Aptos client targeting the desired network. 
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

// Obtain WALLET_ACCESS_KEY from your Shinami web portal.
const key = new KeyClient(WALLET_ACCESS_KEY);
const wal = new WalletClient(WALLET_ACCESS_KEY);

// WALLET_SECRET MUST be used consistently with this wallet id.
// You are responsible for safe-keeping the (walletId, secret) pair.
// Shinami cannot recover it for you.
const signer = new ShinamiWalletSigner("my_wallet_id", wal, WALLET_SECRET, key);

// Get or create the sender account on chain. Since this is a non-sponsored transaction, 
// your account MUST have APT in it in order to execute a transaction.
const senderAccount = AccountAddress.from(await signer1.getAddress(true, true));

// Create a transaction with no feePayer set. This is an example of a SimpleTransaction
const transaction = await aptos.transaction.build.simple({
  sender: senderAccount,
  data: {
    function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
    functionArguments: [1, 2],
  },
  withFeePayer: false,
  options: {
    expireTimestamp: Math.floor(Date.now() / 1000) + 5 * 60,
  },
});

// Sign tx with invisible wallet.
const { signature } = await signer.signTransaction(transaction);

// Deserialize the result to an AccountAuthenticator
const accountAuthenticator = AccountAuthenticator.deserialize(
  new Deserializer(Uint8Array.from(signature)),
);

// Submit the tx for execution
const pending = aptos.transaction.submit.simple({
  transaction,
  senderAuthenticator: (accountAuthenticator as AccountAuthenticatorEd25519)
});

// Wait for it to be committed on-chain.
const committed = await aptos.transaction.waitForTransaction({
  transactionHash: pending.hash,
});
```

To use the invisible wallet to execute a gasless transaction, which seamlessly integrates with Shinami's Aptos gas station:

```ts
import { 
  Aptos, 
  AptosConfig, 
  Network, 
  AccountAddress, 
} from "@aptos-labs/ts-sdk";
import {
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
} from "@shinami/clients/aptos";

// Create your Aptos client targeting the desired network. 
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

// Obtain SUPER_ACCESS_KEY from your Shinami web portal.
// It MUST be authorized for all of these Aptos services:
// - Gas station (The fund your key is tied to must have funds in it)
// - Wallet service
const key = new KeyClient(SUPER_ACCESS_KEY);
const wal = new WalletClient(SUPER_ACCESS_KEY);

// WALLET_SECRET MUST be used consistently with this wallet id.
// You are responsible for safe-keeping the (walletId, secret) pair.
// Shinami cannot recover it for you.
const signer = new ShinamiWalletSigner("my_wallet_id", wal, WALLET_SECRET, key);

// Get or create the sender account on chain. You do not need APT in this account since
// we'll be using Shinami's gas station to sponsor the transaction.
const senderAccount = AccountAddress.from(await signer1.getAddress(true, true));

// Create a transaction with feePayer set. This is an example of a SimpleTransaction
const transaction = await aptos.transaction.build.simple({
  sender: senderAccount,
  data: {
    function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
    functionArguments: [1, 2],
  },
  withFeePayer: true,
  options: {
    expireTimestamp: Math.floor(Date.now() / 1000) + 5 * 60,
  },
});

// Execute the gasless tx using your invisible wallet.
const pending = signer.executeGaslessTransaction(transaction);

// Wait for it to be committed on-chain.
const committed = await aptos.transaction.waitForTransaction({
  transactionHash: pending.hash,
});
```

## Development

### Build

```console
$ npm run build
```

### Lint

```console
$ npm run lint
```

### Unit test

```console
$ npm run test
```

### Integration test

The integration tests for Sui make use of the [Sui Move example](../../examples/sui-move/) package, which has been deployed to [Sui Testnet](https://testnet.suivision.xyz/package/0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975).
Obtain `<your_sui_super_access_key>` from [Shinami web portal](https://app.shinami.com/access-keys).
The key must be authorized for all of these services, targeting _Sui Testnet_:

- Node service
- Gas station - you must also have some available balance in your gas fund.
- Wallet service

The integration tests for Aptos make use of the [Aptos Move example](../../examples/aptos-move/) package, which has been deployed to [Aptos Testnet](https://explorer.aptoslabs.com/account/0x08f91c1523658608e41e628b9a36790a19ec272a2c27084cf2acacbb45fc1643/modules/code/math?network=testnet).
Obtain `<your_aptos_super_access_key>` from [Shinami web portal](https://app.shinami.com/access-keys).
The key must be authorized for all of these services, targeting _Aptos Testnet_:

- Gas station - you must also have some available balance in your gas fund.

Once you have the super keys for both chains,

```shell
export SUI_NODE_ACCESS_KEY=<your_sui_super_access_key>
export SUI_GAS_ACCESS_KEY=<your_sui_super_access_key>
export SUI_WALLET_ACCESS_KEY=<your_sui_super_access_key>
export APTOS_GAS_ACCESS_KEY=<your_aptos_super_access_key>

npm run integration
```

The integration tests by default talk to Shinami's production endpoints.
You can also make it talk to alternative endpoints by modifying [sui/integration.env.ts](test/sui/integration.env.ts) and [aptos/integration.env.ts](test/aptos/integration.env.ts).

### Code coverage

Similar to [integration test](#integration-test):

```shell
export SUI_NODE_ACCESS_KEY=<your_sui_super_access_key>
export SUI_GAS_ACCESS_KEY=<your_sui_super_access_key>
export SUI_WALLET_ACCESS_KEY=<your_sui_super_access_key>
export APTOS_GAS_ACCESS_KEY=<your_aptos_super_access_key>

npm run coverage
```

The HTML coverage report is available at `coverage/lcov-report/index.html`.

### Clean

```console
$ npm run clean
```
