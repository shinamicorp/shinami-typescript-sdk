import { getSuiVisionAccountUrl } from "@/lib/hooks/sui";
import { AUTH_API_BASE, LOGIN_PAGE_PATH } from "@shinami/nextjs-zklogin";
import { useZkLoginSession } from "@shinami/nextjs-zklogin/client";
import Link from "next/link";

// This is a publically accessible page, displaying optional contents for signed-in users.
export default function Index() {
  const { user, isLoading } = useZkLoginSession();

  if (isLoading) return <p>Loading zkLogin session...</p>;

  if (user) {
    // Signed-in experience.
    return (
      <>
        <h1>Hello, {user.oidProvider} user!</h1>
        <div>
          <Link href={getSuiVisionAccountUrl(user.wallet)} target="_blank">
            My zkLogin wallet address
          </Link>
        </div>
        <div>
          <Link href="/protected">Sui calculator</Link>
        </div>
        <div>
          <Link href={`${AUTH_API_BASE}/logout`}>Sign out</Link>
        </div>
      </>
    );
  } else {
    // Anonymous experience.
    return (
      <>
        <h1>Hello, anonymous user!</h1>
        <div>
          <Link href={LOGIN_PAGE_PATH}>Sign in</Link>
        </div>
      </>
    );
  }
}
