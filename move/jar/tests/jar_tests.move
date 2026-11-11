#[test_only]
module jar::jar_tests;

use jar::jar;
use std::unit_test::destroy;
use sui::clock;
use sui::sui::SUI;

#[test]
fun test_new_sets_lock_and_path() {
    let ctx = &mut tx_context::dummy();
    let (j, cap) = jar::new_for_testing<SUI>(1_000, ctx);
    let mut clock = clock::create_for_testing(ctx);
    assert!(j.unlock_ms() == 1_000);
    assert!(j.taken() == 0);
    assert!(cap.jar_id().to_address() == j.deposit_path());
    assert!(!j.is_open(&clock));
    clock.set_for_testing(1_000);
    assert!(j.is_open(&clock));
    destroy(j);
    destroy(cap);
    clock.destroy_for_testing();
}

#[test, expected_failure(abort_code = jar::ELocked)]
fun test_take_before_unlock_aborts() {
    let ctx = &mut tx_context::dummy();
    let (mut j, cap) = jar::new_for_testing<SUI>(1_000, ctx);
    let mut clock = clock::create_for_testing(ctx);
    clock.set_for_testing(999);
    let b = j.take(&cap, 1, &clock);
    destroy(b);
    abort 0
}

#[test, expected_failure(abort_code = jar::EWrongCap)]
fun test_take_with_other_cap_aborts() {
    let ctx = &mut tx_context::dummy();
    let (mut j, cap) = jar::new_for_testing<SUI>(0, ctx);
    let (other, other_cap) = jar::new_for_testing<SUI>(0, ctx);
    let clock = clock::create_for_testing(ctx);
    let b = j.take(&other_cap, 1, &clock);
    destroy(b);
    destroy(cap);
    destroy(other);
    abort 0
}

#[test, expected_failure(abort_code = jar::EZeroAmount)]
fun test_take_zero_aborts() {
    let ctx = &mut tx_context::dummy();
    let (mut j, cap) = jar::new_for_testing<SUI>(0, ctx);
    let clock = clock::create_for_testing(ctx);
    let b = j.take(&cap, 0, &clock);
    destroy(b);
    abort 0
}
