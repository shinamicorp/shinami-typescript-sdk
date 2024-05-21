// Copyright 2023 Shinami Corp.
// SPDX-License-Identifier: Apache-2.0

/// Example module with some math functions.
module example::math {
    use sui::event;

    struct AddResult has copy, drop {
        result: u64
    }

    /// x + y
    public entry fun add(x: u64, y: u64) {
        event::emit(AddResult {
            result: x + y
        })
    }
}
