# Shinami Clients SDK

TypeScript clients for [Shinami](https://www.shinami.com/) services for the [Sui](https://sui.io/) blockchain.

- [Node service](#node-service)
- [Gas station](#gas-station)
- [Invisible wallet](#invisible-wallet)
- [zkLogin wallet](#zklogin-wallet)

## Install

```console
$ npm install @shinami/clients
```

## Usage

### Node service

To create a Sui RPC client:

```ts
import { createSuiClient } from "@shinami/clients";

// Obtain NODE_ACCESS_KEY from your Shinami web portal.
const sui = createSuiClient(NODE_ACCESS_KEY);
```

The returned `sui` object is a [SuiClient](https://github.com/MystenLabs/sui/blob/3dacfa02ab67469f5d5a42aa6146b34bffbf7008/sdk/typescript/src/client/client.ts#L91) configured to use Shinami's node service.
It supports both HTTP JSON RPC requests as well as WebSocket subscriptions.

**Note that `NODE_ACCESS_KEY` determines which Sui network later operations are targeting.**

### Gas station

**Note that gas station should be integrated from your service backend.**
This is so you don't leak your `GAS_ACCESS_KEY` to your end users, and to allow you to control whose and what transactions to sponsor.

To use gas station with a local signer:

```ts
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import {
  GasStationClient,
  buildGaslessTransactionBytes,
  createSuiClient,
} from "@shinami/clients";

// Obtain NODE_ACCESS_KEY and GAS_ACCESS_KEY from your Shinami web portal.
// They MUST be associated with the same network.
const sui = createSuiClient(NODE_ACCESS_KEY);
const gas = new GasStationClient(GAS_ACCESS_KEY);

// You'll want to persist the key pair instead of always creating new ones.
const keypair = new Ed25519Keypair();

const gaslessTx = await buildGaslessTransactionBytes({
  sui,
  build: async (txb) => {
    // Program your TransactionBlock.
    // DO NOT set sender or gas data.
    txb.moveCall({
      target: `${EXAMPLE_PACKAGE_ID}::math::add`,
      arguments: [txb.pure(1), txb.pure(2)],
    });
  },
});

// Request gas sponsorship.
const { txBytes, signature: gasSignature } = await gas.sponsorTransactionBlock(
  gaslessTx,
  keypair.toSuiAddress(),
  5_000_000
);

// Sign the sponsored tx.
const { signature } = await keypair.signTransactionBlock(fromB64(txBytes));

// Execute the sponsored & signed tx.
const txResp = await sui.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [signature, gasSignature],
});
```

### Invisible wallet

To use the invisible wallet as a signer for a regular (non-sponsored) transaction block:

```ts
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
  createSuiClient,
} from "@shinami/clients";

// Obtain NODE_ACCESS_KEY and WALLET_ACCESS_KEY from your Shinami web portal.
const sui = createSuiClient(NODE_ACCESS_KEY);
const key = new KeyClient(WALLET_ACCESS_KEY);
const wal = new WalletClient(WALLET_ACCESS_KEY);

// WALLET_SECRET MUST be used consistently with this wallet id.
// You are responsible for safe-keeping the (walletId, secret) pair.
// Shinami cannot recover it for you.
const signer = new ShinamiWalletSigner("my_wallet_id", wal, WALLET_SECRET, key);

// Program your TransactionBlock.
const txb = new TransactionBlock();
txb.moveCall({
  target: `${EXAMPLE_PACKAGE_ID}::math::add`,
  arguments: [txb.pure(1), txb.pure(2)],
});
txb.setSender(await signer.getAddress(true /* autoCreate */));
txb.setGasBudget(5_000_000);
// Your invisible wallet MUST have sufficient gas for this to succeed.
const txBytes = await txb.build({ client: sui });

// Sign tx with invisible wallet.
const { signature } = await signer.signTransactionBlock(txBytes);

// Execute the signed tx.
const txResp = await sui.executeTransactionBlock({
  transactionBlock: txBytes,
  signature,
});
```

To use the invisible wallet to execute a gasless transaction block, which seamlessly integrates with Shinami node service and gas station:

```ts
import {
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
  buildGaslessTransactionBytes,
  createSuiClient,
} from "@shinami/clients";

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

const gaslessTx = await buildGaslessTransactionBytes({
  sui,
  build: async (txb) => {
    // Program your TransactionBlock.
    // DO NOT set sender or gas data.
    txb.moveCall({
      target: `${EXAMPLE_PACKAGE_ID}::math::add`,
      arguments: [txb.pure(1), txb.pure(2)],
    });
  },
});

// Execute the gasless tx using your invisible wallet.
const txResp = await signer.executeGaslessTransactionBlock(
  gaslessTx,
  5_000_000
);
```

### zkLogin wallet

You can use Shinami's zkLogin wallet services as the salt provider and zkProver in your [zkLogin](https://docs.sui.io/concepts/cryptography/zklogin) implementation.

```ts
import { ZkProverClient, ZkWalletClient } from "@shinami/clients";

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
  salt
);

// Now you can sign transaction blocks with ephemeralPrivateKey, and assemble the zkLogin signature
// using zkProof.
```

#### Beneficiary graph API

Apps using Shinami invisible wallets can participate in [Bullshark Quests](https://quests.mystenlabs.com/) by allowing users to link their invisible wallets with self-custody wallets that own Bullshark NFTs, through the use of [beneficiary graph](https://github.com/shinamicorp/account-graph).

```ts
import {
  EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET,
  KeyClient,
  ShinamiWalletSigner,
  WalletClient,
} from "@shinami/clients";

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
  "0x1234"
);

// This should return the address we just set.
const beneficiary = await signer.getBeneficiary(graphId);
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

The integration tests make use of the [Move example](../../move_example/) package, which has been deployed to [Sui Testnet](https://suiexplorer.com/object/0xd8f042479dcb0028d868051bd53f0d3a41c600db7b14241674db1c2e60124975?network=testnet).
Obtain `<your_super_access_key>` from [Shinami web portal](https://app.shinami.com/access-keys).
The key must be authorized for all of these services, targeting _Sui Testnet_:

- Node service
- Gas station - you must also have some available balance in your gas fund.
- Wallet service

```shell
export NODE_ACCESS_KEY=<your_super_access_key>
export GAS_ACCESS_KEY=<your_super_access_key>
export WALLET_ACCESS_KEY=<your_super_access_key>

npm run integration
```

The integration tests by default talk to Shinami's production endpoints.
You can also make it talk to alternative endpoints by modifying [integration.env.ts](test/integration.env.ts).

### Code coverage

Similar to [integration test](#integration-test):

```shell
export NODE_ACCESS_KEY=<your_super_access_key>
export GAS_ACCESS_KEY=<your_super_access_key>
export WALLET_ACCESS_KEY=<your_super_access_key>

npm run coverage
```

The HTML coverage report is available at `coverage/lcov-report/index.html`.

### Clean

```console
$ npm run clean
```
