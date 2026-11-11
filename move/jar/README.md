# Jar: A Move Object with Its Own Bitcoin Address

Part 4 of Day 3: using hBTC in your own Move code.

Hashi derives a Bitcoin deposit address from any Sui address, and an object's ID is a Sui address. So a shared object can have a Bitcoin address of its own:

```
jar id 0xa0f2...2abb  ->  generateDepositAddress({ suiAddress: jar id })
                      ->  bc1p890h9vuv6epk4f3q0u5kar4kh7k7e8908uzx22pyn6jfgldldvmq45ne7h   (Bitcoin mainnet)
                      ->  tb1ppkgsq727fng0nep5s2mjcg2f9urkjx6uxl9dealhu37903e6mzmq4yjxnu   (Signet, Hashi testnet)
```

BTC sent to that address and recorded with `recipient = jar id` is minted by Hashi's `confirm_deposit` with `balance::send_funds(btc, jar id)`: the hBTC lands in the jar's own address balance, not in anyone's wallet. Only the holder of the jar's `JarCap` can take it out, and only after `unlock_ms`:

```move
public fun take<T>(self: &mut Jar<T>, cap: &JarCap<T>, amount: u64, clock: &Clock): Balance<T> {
    assert!(cap.jar_id == self.id.to_inner(), EWrongCap);
    assert!(clock.timestamp_ms() >= self.unlock_ms, ELocked);
    assert!(amount > 0, EZeroAmount);
    let out = balance::redeem_funds(balance::withdraw_funds_from_object<T>(&mut self.id, amount));
    ...
}
```

The package does not depend on Hashi. `Jar<T>` is generic: `Jar<hashi::btc::BTC>` holds hBTC, and `Jar<SUI>` let us test the same path on testnet without Bitcoin. To send the BTC back to Bitcoin, one PTB: `jar::take<BTC>(jar, cap, amount, clock)` then `withdraw::request_withdrawal(hashi, clock, balance, witness_program)`. Hashi's `request_withdrawal` is a private `entry` function, so it cannot be called from Move, but a PTB can hand it the `Balance<BTC>` an earlier command returned.

`held(jar, &AccumulatorRoot)` reads the jar's balance on chain with `balance::settled_funds_value`. The accumulator root is the shared object `0xacc`.

## Verified on Sui testnet (11 November 2026)

| Step | Transaction | Result |
|---|---|---|
| Publish | `HBDkz2qkVv9HhDetfoAPbXsd3SaCQM9HmG4An4APXbLT` | package `0x803071c2da4a4ab1d54ce8a47cb55ec5ec9ec49b461343e0c567a3545181c065` |
| `jar::new<SUI>`, unlock 150 s later | `2mAG8BmQcNGRq79jZjvxve9kjxt6jz2PQictNz3EsvmE` | jar `0xa0f24067c14e529f28e4dc2ed9f1005ce6570c57e6eea3f77d709a256acf2abb`, cap `0x8193842ef49c301db6085de0ee40be09f179b277c9a3a0e55e822baaec7fd232` |
| `balance::send_funds` 0.01 SUI to the jar's ID, the call Hashi mints with | `FQLAhzyrsNW62Q27fKdvJJtNhauyDkB326jA4w5eXp6B` | GraphQL and `core.getBalance`: the jar's address balance is 10,000,000 |
| `jar::take` before unlock (dry run) | none | `MoveAbort ... take, 10` (`ELocked`) |
| `jar::held` and `jar::taken` (simulated) | none | 10,000,000 and 0 |
| `jar::take` after unlock, then `send_funds` to the owner | `3StPb2xWLz4FiStur6z5dq3fvnUwwAsFgB1R8GQe2hM8` | `JarTaken` 10,000,000; jar -10,000,000, owner +8,999,650 after gas |

`sui move test`: 4 tests pass (lock, wrong cap, zero amount, the deposit path equals the jar id).

Not verified: a real Hashi mint into a jar. That needs BTC on mainnet (at least 30,000 sats) or 1 signet BTC on testnet. Hashi's deposit takes any 32-byte `derivation_path` and mints with `send_funds` to it (`deposit.move`, `confirm_deposit`), which is the path tested above with SUI.

## Run it

```sh
cd move/jar
sui move test
sui client publish
PKG=0x...   JAR=0x...   CAP=0x...   ME=$(sui client active-address)

# a jar that opens in 10 minutes
sui client ptb --move-call $PKG::jar::new "<0x2::sui::SUI>" $(( $(date +%s) * 1000 + 600000 )) --assign cap --transfer-objects "[cap]" @$ME

# put 0.01 SUI in it, the way Hashi puts hBTC in it
sui client ptb --split-coins gas "[10000000]" --assign c --move-call 0x2::coin::into_balance "<0x2::sui::SUI>" c --assign b --move-call 0x2::balance::send_funds "<0x2::sui::SUI>" b @$JAR

# take it out once it is open
sui client ptb --move-call $PKG::jar::take "<0x2::sui::SUI>" @$JAR @$CAP 10000000 @0x6 --assign out --move-call 0x2::balance::send_funds "<0x2::sui::SUI>" out @$ME
```

For hBTC, use the type `<hashi package>::btc::BTC` and get the jar's Bitcoin address with `client.hashi.generateDepositAddress({ suiAddress: JAR })`.
