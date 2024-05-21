/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/zklogin";
import { UseMutationResult, useMutation } from "@tanstack/react-query";
import { useLogout } from "./api.js";
import { ZkLoginLocalSession, useSaveZkLoginLocalSession } from "./session.js";

/**
 * React hook for initializing a new zkLogin session.
 *
 * Uses TanStack mutation.
 */
export function useNewZkLoginSession(): UseMutationResult<
  ZkLoginLocalSession,
  unknown,
  { getMaxEpoch: () => Promise<number> | number }
> {
  const { mutateAsync: logout } = useLogout();
  const { mutateAsync: save } = useSaveZkLoginLocalSession();

  return useMutation({
    mutationFn: async ({ getMaxEpoch }) => {
      await logout(undefined);

      const ephemeralKeyPair = new Ed25519Keypair();
      const jwtRandomness = generateRandomness();
      const maxEpoch = await getMaxEpoch();
      const nonce = generateNonce(
        ephemeralKeyPair.getPublicKey(),
        maxEpoch,
        jwtRandomness,
      );

      const session = { ephemeralKeyPair, maxEpoch, jwtRandomness, nonce };
      await save(session);
      return session;
    },
  });
}
