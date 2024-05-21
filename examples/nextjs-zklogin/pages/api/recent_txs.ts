import { sui } from "@/lib/api/shinami";
import { RecentTxsResponse } from "@/lib/shared/interfaces";
import { withZkLoginUserRequired } from "@shinami/nextjs-zklogin/server/pages";

// This is an auth-protected API route, augmented with user's zkLogin info.
export default withZkLoginUserRequired<RecentTxsResponse>(
  sui,
  async (_, res, user) => {
    // This Sui query can easily be performed on the client side as well.
    const txs = await sui.queryTransactionBlocks({
      filter: { FromAddress: user.wallet },
      order: "descending",
      limit: 5,
    });

    res.json({ txDigests: txs.data.map((x) => x.digest) });
  },
);
