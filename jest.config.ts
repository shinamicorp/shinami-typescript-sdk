/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^(\\.{1,2}/.+)\\.js$": "$1",
  },
  collectCoverageFrom: ["src/**/*.{js,ts}"],
};

export default config;
