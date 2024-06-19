import { useAddMutation, useRecentTxsQuery } from "@/lib/hooks/api";
import { getSuiVisionTransactionUrl } from "@/lib/hooks/sui";
import { AddResponse } from "@/lib/shared/interfaces";
import { withZkLoginSessionRequired } from "@shinami/nextjs-zklogin/client";
import Link from "next/link";
import { useState } from "react";

// This is an auth-protected page. Anonymous users will be auto-redirected to the login page.
export default withZkLoginSessionRequired(({ session }) => {
  const { isLoading, user, localSession } = session;
  const [result, setResult] = useState<AddResponse>();
  const { mutateAsync: add, isPending: isAdding } = useAddMutation();
  const { data: txs, isLoading: isLoadingTxs } = useRecentTxsQuery();

  if (isLoading) return <p>Loading zkLogin session...</p>;

  return (
    <>
      <h1>Hello, {user.oidProvider} user!</h1>
      <div>
        <form
          onSubmit={(e) => {
            void (async () => {
              e.preventDefault();

              const data = new FormData(e.currentTarget);
              const x = parseInt(data.get("x") as string);
              const y = parseInt(data.get("y") as string);
              if (isNaN(x) || isNaN(y)) return;

              const result = await add({
                x,
                y,
                keyPair: localSession.ephemeralKeyPair,
              });
              setResult(result);
            })();
          }}
        >
          <div>
            <input
              type="number"
              min={0}
              name="x"
              placeholder="x"
              onChange={() => setResult(undefined)}
            />{" "}
            +{" "}
            <input
              type="number"
              min={0}
              name="y"
              placeholder="y"
              onChange={() => setResult(undefined)}
            />{" "}
            ={" "}
            {result ? (
              <Link
                href={getSuiVisionTransactionUrl(result.txDigest)}
                target="_blank"
              >
                {result.result}
              </Link>
            ) : (
              "?"
            )}
          </div>
          <div>
            <input type="submit" value="Calculate on Sui" disabled={isAdding} />
          </div>
        </form>
      </div>
      <div>
        <p>Recent transactions:</p>
        {isLoadingTxs ? (
          <p>Loading...</p>
        ) : !txs ? (
          <p>Failed to load recent transactions</p>
        ) : (
          <ul>
            {txs.txDigests.map((txDigest) => (
              <li key={txDigest}>
                <Link
                  href={getSuiVisionTransactionUrl(txDigest)}
                  target="_blank"
                >
                  {txDigest}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
});
