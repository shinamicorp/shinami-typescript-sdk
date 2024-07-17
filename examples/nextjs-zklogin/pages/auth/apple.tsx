import { withAppleCallback } from "@shinami/nextjs-zklogin/client";

export default withAppleCallback(({ status }) => {
  switch (status) {
    case "loggingIn":
      return <p>Chugging along...</p>;
    case "error":
      return <p>Something went wrong</p>;
    default:
      return <p>Apple callback</p>;
  }
});
