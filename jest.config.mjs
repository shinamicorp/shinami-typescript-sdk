/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createDefaultEsmPreset } from "ts-jest";

const testType = process.argv[2] || "unit";

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  ...createDefaultEsmPreset(),
  moduleNameMapper: {
    "^(\\.{1,2}/.+)\\.js$": "$1",
  },
  collectCoverageFrom: ["src/**/*.{js,ts}"],
  coverageDirectory: `coverage/${testType}`
};
