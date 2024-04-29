// Copyright 2024 Shinami Corp.
// SPDX-License-Identifier: Apache-2.0

script {
    use example::math::{add, div, emit_result};

	fun avg2(x: u64, y: u64) {
        emit_result(div(add(x, y), 2))
    }
}
