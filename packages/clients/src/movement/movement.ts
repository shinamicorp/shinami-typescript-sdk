import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export function createLocalMovementClient(): Aptos {
  return new Aptos(
    new AptosConfig({
      fullnode: "http://localhost:30731/v1",
      indexer: undefined,
      faucet: "http://localhost:30732",
      network: Network.LOCAL,
    }),
  );
}
