#!/bin/bash

# Copyright 2023-2024 Shinami Corp.
# SPDX-License-Identifier: Apache-2.0

# Wrapper script for running ci and dependency compatibility builds. This helps
# avoid false build failures due to benign git diffs from running the build
# with updated versions

env \
    NEXT_PUBLIC_SHINAMI_NODE_ACCESS_KEY=fake_key \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=fake_id \
    NEXT_PUBLIC_FACEBOOK_CLIENT_ID=fake_id \
    NEXT_PUBLIC_TWITCH_CLIENT_ID=fake_id \
    NEXT_PUBLIC_APPLE_CLIENT_ID=fake_id \
    npm run build

# Discard any inconsequential diffs to files due to dependency compatibility
# tests
git checkout examples/nextjs-zklogin/next-env.d.ts
