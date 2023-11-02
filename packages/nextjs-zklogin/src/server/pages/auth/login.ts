/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ed25519PublicKey } from "@mysten/sui.js/keypairs/ed25519";
import {
  computeZkLoginAddress,
  genAddressSeed,
  generateNonce,
} from "@mysten/zklogin";
import { withIronSessionApiRoute } from "iron-session/next";
import { jwtVerify } from "jose";
import { NextApiHandler, NextApiRequest } from "next";
import { validate } from "superstruct";
import {
  OidProvider,
  ZkLoginRequest,
  ZkLoginUser,
  ZkLoginUserId,
} from "../../../user.js";
import { first, publicKeyFromBase64 } from "../../../utils.js";
import {
  CurrentEpochProvider,
  SaltProvider,
  ZkProofProvider,
  getCurrentEpoch,
  getSalt,
  getZkProof,
  oidProviders,
} from "../../providers.js";
import { sessionConfig } from "../session.js";
import { methodDispatcher } from "../utils.js";

class ZkLoginAuthError extends Error {}

async function getExpires(
  req: NextApiRequest,
  epochProvider: CurrentEpochProvider,
  enableOidProvider: (provider: OidProvider) => Promise<boolean> | boolean
): Promise<Date> {
  const [error, body] = validate(req.body, ZkLoginRequest, { mask: true });
  if (error) throw new ZkLoginAuthError(error.message);

  if (!(await enableOidProvider(body.oidProvider)))
    throw new ZkLoginAuthError(`OpenID provider disabled: ${body.oidProvider}`);

  const { epoch, epochStartTimestampMs, epochDurationMs } =
    await getCurrentEpoch(epochProvider);
  const validEpochs = body.maxEpoch - epoch + 1;
  if (validEpochs <= 0) throw new ZkLoginAuthError("maxEpoch expired");

  // An approximation of maxEpoch end time. Doesn't have to be precise.
  return new Date(epochStartTimestampMs + epochDurationMs * validEpochs);
}

async function getZkLoginUser(
  req: NextApiRequest,
  saltProvider: SaltProvider,
  zkProofProvider: ZkProofProvider,
  allowUser: (user: ZkLoginUserId) => Promise<boolean> | boolean
): Promise<ZkLoginUser> {
  const [error, body] = validate(req.body, ZkLoginRequest);
  if (error) throw new ZkLoginAuthError(error.message);

  const oidConfig = oidProviders[body.oidProvider];

  let jwtClaims;
  try {
    jwtClaims = (
      await jwtVerify(body.jwt, oidConfig.getKey, {
        requiredClaims: ["iss", "aud", "nonce", body.keyClaimName],
      })
    ).payload;
  } catch (e) {
    throw new ZkLoginAuthError("Bad jwt");
  }

  if (
    jwtClaims.nonce !==
    generateNonce(
      new Ed25519PublicKey(body.extendedEphemeralPublicKey),
      Number(body.maxEpoch),
      body.jwtRandomness
    )
  )
    throw new ZkLoginAuthError("Invalid jwt nonce");

  const iss = jwtClaims.iss!;
  const aud = first(jwtClaims.aud)!;
  const keyClaimValue = jwtClaims[body.keyClaimName] as string;
  const id: ZkLoginUserId = {
    iss,
    aud,
    keyClaimName: body.keyClaimName,
    keyClaimValue,
  };

  if (!(await allowUser(id))) throw new ZkLoginAuthError("User not allowed");

  const salt = await getSalt(saltProvider, {
    jwt: body.jwt,
    keyClaimName: body.keyClaimName,
    subWallet: 0, // TODO - expose additional sub-wallets.
  });
  const wallet = computeZkLoginAddress({
    claimName: body.keyClaimName,
    claimValue: keyClaimValue,
    iss,
    aud,
    userSalt: salt,
  });
  const addressSeed = genAddressSeed(
    salt,
    body.keyClaimName,
    keyClaimValue,
    aud
  ).toString();
  const partialProof = await getZkProof(zkProofProvider, {
    jwt: body.jwt,
    ephemeralPublicKey: publicKeyFromBase64(body.extendedEphemeralPublicKey),
    maxEpoch: body.maxEpoch,
    jwtRandomness: BigInt(body.jwtRandomness),
    salt,
    keyClaimName: body.keyClaimName,
  });

  return {
    id,
    oidProvider: body.oidProvider,
    jwtClaims: jwtClaims as ZkLoginUser["jwtClaims"],
    maxEpoch: body.maxEpoch,
    wallet,
    zkProof: { ...partialProof, addressSeed },
  };
}

function loginHandler(
  epochProvider: CurrentEpochProvider,
  saltProvider: SaltProvider,
  zkProofProvider: ZkProofProvider,
  enableOidProvider: (provider: OidProvider) => Promise<boolean> | boolean,
  allowUser: (user: ZkLoginUserId) => Promise<boolean> | boolean
): NextApiHandler {
  return withIronSessionApiRoute(
    async (req, res) => {
      // Skip if already responded which implies we failed to get expires
      if (res.headersSent) return;

      try {
        req.session.user = await getZkLoginUser(
          req,
          saltProvider,
          zkProofProvider,
          allowUser
        );
      } catch (e) {
        if (!(e instanceof ZkLoginAuthError)) throw e;
        return res.status(400).json({ error: e.message });
      }

      await req.session.save();
      res.json(req.session.user);
    },
    async (req, res) => {
      let expires;
      try {
        expires = await getExpires(req, epochProvider, enableOidProvider);
      } catch (e) {
        if (!(e instanceof ZkLoginAuthError)) throw e;
        res.status(400).json({ error: e.message });
        return sessionConfig;
      }

      return {
        ...sessionConfig,
        cookieOptions: {
          ...sessionConfig.cookieOptions,
          expires,
          maxAge: Math.floor((expires.getTime() - new Date().getTime()) / 1000),
        },
      };
    }
  );
}

export function login(
  epochProvider: CurrentEpochProvider,
  saltProvider: SaltProvider,
  zkProofProvider: ZkProofProvider,
  enableOidProvider: (provider: OidProvider) => Promise<boolean> | boolean,
  allowUser: (user: ZkLoginUserId) => Promise<boolean> | boolean
): NextApiHandler {
  return methodDispatcher({
    POST: loginHandler(
      epochProvider,
      saltProvider,
      zkProofProvider,
      enableOidProvider,
      allowUser
    ),
  });
}
