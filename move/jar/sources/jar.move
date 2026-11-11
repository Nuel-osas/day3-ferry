// SPDX-License-Identifier: Apache-2.0

/// A Move object with its own Bitcoin address.
///
/// Hashi derives a Bitcoin deposit address from any Sui address, and an object's ID is a Sui
/// address. A `Jar` is a shared object whose ID is that derivation path: BTC sent to the jar's
/// Bitcoin address and recorded with `recipient = jar id` is minted by Hashi as hBTC straight into
/// the jar's own address balance (`balance::send_funds`). Only the holder of the jar's cap can take
/// it out, and only once the clock passes `unlock_ms`.
///
/// ### Key Features:
///
/// - Generic over the coin: `Jar<hashi::btc::BTC>` for hBTC, `Jar<SUI>` to test without Bitcoin
/// - No dependency on Hashi's package: Hashi pays the jar's address, the jar pulls with
///   `balance::withdraw_funds_from_object`
/// - The time lock is enforced on chain; the cap is transferable
///
/// ### State Machine:
///
/// Locked (clock < unlock_ms) -> Open (clock >= unlock_ms)
module jar::jar;

use sui::accumulator::AccumulatorRoot;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::event::emit;

// === Structs ===

public struct Jar<phantom T> has key {
    id: UID,
    unlock_ms: u64,
    taken: u64,
}

public struct JarCap<phantom T> has key, store {
    id: UID,
    jar_id: ID,
}

// === Events ===

public struct JarCreated<phantom T> has copy, drop {
    jar_id: ID,
    cap_id: ID,
    unlock_ms: u64,
}

public struct JarTaken<phantom T> has copy, drop {
    jar_id: ID,
    amount: u64,
    taken: u64,
}

// === Errors ===
// State errors (10-19)
/// The jar is locked until `unlock_ms`.
const ELocked: u64 = 10;

// Validation errors (20-29)
/// Take more than zero.
const EZeroAmount: u64 = 20;

// Reference errors (50-59)
/// This cap opens a different jar.
const EWrongCap: u64 = 50;

// === Public Functions ===

/// Share a new jar that opens at `unlock_ms` and return the cap that opens it.
public fun new<T>(unlock_ms: u64, ctx: &mut TxContext): JarCap<T> {
    let jar = Jar<T> { id: object::new(ctx), unlock_ms, taken: 0 };
    let jar_id = jar.id.to_inner();
    let cap = JarCap<T> { id: object::new(ctx), jar_id };
    emit(JarCreated<T> { jar_id, cap_id: cap.id.to_inner(), unlock_ms });
    transfer::share_object(jar);
    cap
}

/// Take `amount` out of the jar's address balance. Aborts if the jar is still locked, if the cap
/// belongs to another jar, or if the jar holds less than `amount`.
public fun take<T>(self: &mut Jar<T>, cap: &JarCap<T>, amount: u64, clock: &Clock): Balance<T> {
    assert!(cap.jar_id == self.id.to_inner(), EWrongCap);
    assert!(clock.timestamp_ms() >= self.unlock_ms, ELocked);
    assert!(amount > 0, EZeroAmount);
    let out = balance::redeem_funds(balance::withdraw_funds_from_object<T>(&mut self.id, amount));
    self.taken = self.taken + amount;
    emit(JarTaken<T> { jar_id: self.id.to_inner(), amount, taken: self.taken });
    out
}

// === View Functions ===

/// The address Hashi derives the jar's Bitcoin address from, and where hBTC is minted to.
public fun deposit_path<T>(self: &Jar<T>): address { self.id.to_address() }

public fun unlock_ms<T>(self: &Jar<T>): u64 { self.unlock_ms }

public fun taken<T>(self: &Jar<T>): u64 { self.taken }

public fun jar_id<T>(cap: &JarCap<T>): ID { cap.jar_id }

public fun is_open<T>(self: &Jar<T>, clock: &Clock): bool { clock.timestamp_ms() >= self.unlock_ms }

/// What the jar holds, as settled at the start of this consensus commit.
public fun held<T>(self: &Jar<T>, root: &AccumulatorRoot): u64 {
    balance::settled_funds_value<T>(root, self.id.to_address())
}

// === Test Only ===

#[test_only]
public fun new_for_testing<T>(unlock_ms: u64, ctx: &mut TxContext): (Jar<T>, JarCap<T>) {
    let jar = Jar<T> { id: object::new(ctx), unlock_ms, taken: 0 };
    let cap = JarCap<T> { id: object::new(ctx), jar_id: jar.id.to_inner() };
    (jar, cap)
}
