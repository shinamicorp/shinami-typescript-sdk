import { useAddMutation } from "@/lib/hooks/api";
import { getSuiExplorerTransactionUrl } from "@/lib/hooks/sui";
import { AddResponse } from "@/lib/shared/interfaces";
import { withZkLoginSessionRequired } from "@shinami/nextjs-zklogin/client";
import Link from "next/link";
import { useState } from "react";

// This is a auth-protected page. Anonymous users will be auto-redirected to the login page.
export default withZkLoginSessionRequired(({ session }) => {
  const { isLoading, user, localSession } = session;
  const [result, setResult] = useState<AddResponse>();
  const { mutateAsync: add, isPending: isAdding } = useAddMutation();

  if (isLoading) return <p>Loading zkLogin session...</p>;

  return (
    <>
      <h1>Hello, {user.oidProvider} user!</h1>
      <div>
        <form
          onSubmit={async (e) => {
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
                href={getSuiExplorerTransactionUrl(result.txDigest, true)}
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
    </>
  );
});
