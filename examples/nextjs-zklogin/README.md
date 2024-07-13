# Next.js with zkLogin Example

This example shows how to use `@shinami/nextjs-zklogin` to unify user authentication and Sui transaction signing for your Next.js application, using [zkLogin](https://docs.sui.io/concepts/cryptography/zklogin).
With this unification, you can deliver a user experience like the following:

- User signs into your application using one of the supported social identity providers.
- They now gain access to auth-protected frontend pages and API routes of your application.
- At the same time, they have established control over a Sui address specific to their social identity, and can sign and execute Sui transactions from that address.
- As soon as they sign out, or when the session expires, both abilities are revoked.

## How to use

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:

```bash
npx create-next-app --example https://github.com/shinamicorp/shinami-typescript-sdk/tree/main/examples/nextjs-zklogin my-zklogin-app
```

```bash
yarn create next-app --example https://github.com/shinamicorp/shinami-typescript-sdk/tree/main/examples/nextjs-zklogin my-zklogin-app
```

```bash
pnpm create next-app --example https://github.com/shinamicorp/shinami-typescript-sdk/tree/main/examples/nextjs-zklogin my-zklogin-app
```

## Configure env variables

Several env variables must be set before you can run this example application.
They are listed in [.env](./.env).
It's recommended to create a `.env.local` file and set them in there, because they contain sensitive information that shouldn't be added to git.

### Configure OAuth providers

You will need to configure OAuth providers for your Next.js application.
See [this guide](https://docs.sui.io/guides/developer/cryptography/zklogin-integration/developer-account) for instructions.
You must set at least one of these env variables:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_FACEBOOK_CLIENT_ID`
- `NEXT_PUBLIC_TWITCH_CLIENT_ID`
- `NEXT_PUBLIC_APPLE_CLIENT_ID`

#### About redirect URIs

For Google, Facebook, and Twitch, you must include the respective callback URL in your OAuth application's allowed redirect URIs:

- `https://<your-domain>/auth/google`
- `https://<your-domain>/auth/facebook`
- `https://<your-domain>/auth/twitch`

where `<your-domain>` is the domain name you host the app on.
These providers also support testing on localhost, if you include the respective localhost URL in their allowed redirect URIs:

- `http://localhost:3000/auth/google`
- `http://localhost:3000/auth/facebook`
- `http://localhost:3000/auth/twitch`

For Apple, you must authorize a slightly different redirect URI (note the `api/` prefix):

- `https://<your-domain>/api/auth/apple`

Note that Apple doesn't support either `localhost` or `http`.
Thus for local testing, you'll need to access the dev server on a mock domain, either by modifying `/etc/hosts` (e.g. adding `127.0.0.1 my-local-site.com`) or through a tunneling service such as [ngrok](https://ngrok.com/).
Either way, you must authorize the resulting URL on your Sign in with Apple application.

### Generate session secret

Set `IRON_SESSION_SECRET` to a randomly generated string.
You can use this command to generate it:

```bash
openssl rand -hex 32
```

### Obtain Shinami access keys

By default, this example uses Shinami's node, gas station, and wallet services, to provide the most seamless experience.
For security best practice, you should create two separate access keys and set these env variables:

- `SHINAMI_SUPER_ACCESS_KEY` -
  Super key with access to Shinami node, gas station, and wallet services.
  Make sure your gas fund has some available balance, because this example uses sponsored transactions.
  This key is only used by the API routes on the backend.
- `NEXT_PUBLIC_SHINAMI_NODE_ACCESS_KEY` -
  Shinami node only access key.
  This key is used on the frontend.

Also make sure both access keys are for `Testnet`, because that's where the example Move package is deployed.

## Run dev server

```bash
npm run dev
```

You can now access http://localhost:3000.

To run the dev server with HTTPS, e.g. to test Sign in with Apple, run

```bash
npm run dev -- --experimental-https
```

Assuming you've added `127.0.0.1 my-local-site.com` to `/etc/hosts`, you can then access https://my-local-site.com:3000.
