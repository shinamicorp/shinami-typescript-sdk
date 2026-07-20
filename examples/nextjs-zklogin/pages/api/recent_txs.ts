import { sui, suiGraphql } from "@/lib/api/shinami";
import { RecentTxsResponse } from "@/lib/shared/interfaces";
import { withZkLoginUserRequired } from "@shinami/nextjs-zklogin/server/pages";

interface RecentTransactionsQueryResult {
  transactions: {
    nodes: { digest: string }[];
  };
}

// This is an auth-protected API route, augmented with user's zkLogin info.
export default withZkLoginUserRequired<RecentTxsResponse>(
  sui,
  async (_, res, user) => {
    // This Sui query can easily be performed on the client side as well.
    //
    // Uses GraphQL because "queryTransactionBlocks" (JSON-RPC) has no gRPC equivalent.
    // "last" (not "first") is required to get the most recent transactions - the connection is
    // ordered oldest to newest, so "first" would return the oldest ones instead.
    const { data, errors } =
      await suiGraphql.query<RecentTransactionsQueryResult>({
        query: `
          query RecentTransactions($sender: SuiAddress!, $last: Int) {
            transactions(last: $last, filter: { sentAddress: $sender }) {
              nodes {
                digest
              }
            }
          }
        `,
        variables: { sender: user.wallet, last: 5 },
      });

    if (errors?.length) {
      console.error("GraphQL errors", errors);
      throw new Error(
        `Failed to query recent transactions: ${errors[0].message}`,
      );
    }

    if (!data) {
      throw new Error("GraphQL query returned no data");
    }

    res.json({
      txDigests: data.transactions.nodes.map((x) => x.digest).reverse(),
    });
  },
);
