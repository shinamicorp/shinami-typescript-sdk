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
See [this guide](https://docs.sui.io/concepts/cryptography/zklogin#configure-a-developer-account-with-openid-provider) for instructions.
You must set at least one of these env variables:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_FACEBOOK_CLIENT_ID`
- `NEXT_PUBLIC_TWITCH_CLIENT_ID`

Note that if you are using Twitch, you must add http://localhost:3000/auth/twitch to your application's OAuth Redirect URLs for the local dev server to work.
Other providers allow `localhost` automatically during development.

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
