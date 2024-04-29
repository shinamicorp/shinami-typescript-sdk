// Copyright 2024 Shinami Corp.
// SPDX-License-Identifier: Apache-2.0

module example::math {
    use std::event;

    #[event]
    struct Result has drop, store {
        result: u64
    }

    public fun emit_result(r: u64) {
        event::emit(Result {
            result: r
        })
    }

    public fun add(x: u64, y: u64): u64 {
        x + y
    }

    public fun div(x: u64, y: u64): u64 {
        x / y
    }
    
    public entry fun add_entry(x: u64, y: u64) {
        emit_result(add(x, y))
    }

    public entry fun div_entry(x: u64, y: u64) {
        emit_result(div(x, y))
    }
}
