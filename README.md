# Ferry · Day 3

The class app for **Build with Hashi: Bitcoin as a Sui asset** at SuiHub Lagos (Keys, Dollars and Bitcoin week).

Hashi is Sui's native Bitcoin bridge. Your BTC stays on Bitcoin, at a Taproot address that Sui's validator committee (threshold MPC) and an independent guardian control together, and hBTC is minted on Sui against it, one for one. Burn hBTC and the committee sends BTC back.

Ferry is a small app on the Hashi TypeScript SDK (`@mysten/hashi`), run on Sui mainnet and testnet from the user's own Sui wallet:

- **Your Bitcoin address.** Hashi derives one deposit address per Sui address. Ferry shows it with a QR code, for the connected wallet or any address you type in.
- **Payments.** Hashi does not scan Bitcoin. Ferry reads the address on Bitcoin (Esplora), lists every output that paid it, and says which are minted, recorded, below the minimum, or not recorded yet.
- **Record.** One PTB per Bitcoin transaction, signed by the user's wallet. Anyone can record: the hBTC always goes to the address that derived the deposit address.
- **Track.** Any deposit or withdrawal, by its Sui digest: confirmations, committee approval, the safety delay, the mint; or request, approval, the Bitcoin batch, signatures, confirmation.
- **Withdraw and cancel.** Lock hBTC, see the worst-case miner fee and the guardian's capacity first, and cancel after the cooldown if the committee has not batched it yet.
- **Hashi, live.** Governance values, the committee, the guardian's rate limiter, and the reserve: BTC held against hBTC minted.

Live: https://day3-ferry.vercel.app

There is no server. Everything is read and built in the browser: Sui over gRPC-web and GraphQL, Bitcoin over Esplora, the guardian over its public `/info`.

## How a deposit works

```
1. generateDepositAddress({ suiAddress })            same address every time for the same Sui address
2. send BTC to it from any Bitcoin wallet            at least 30,000 sats on mainnet
3. tx.deposit({ txid, utxos: [{ vout, amountSats }], recipient })
     utxo::utxo_id(txid, vout) -> utxo::utxo(id, amount, recipient) -> deposit::deposit(hashi, utxo, clock)
4. the committee waits for 6 Bitcoin confirmations, then approves on Sui
5. after the 10 minute safety delay, confirm_deposit mints hBTC with balance::send_funds to the recipient
```

A withdrawal is `tx.balance<hBTC>(amount) -> withdraw::request_withdrawal(hashi, clock, balance, witness_program)`. The committee approves it, puts it in a Bitcoin batch (the hBTC is burned there), collects MPC signatures and the guardian's, and confirms once the Bitcoin transaction lands. Ferry's cancel is its own PTB: `withdraw::cancel_withdrawal` returns the locked `Balance<BTC>`, and `balance::send_funds` puts it back in the sender's address balance.

Every write takes the same path (`src/lib/sign.ts`): build the PTB with our client, simulate it, and only then hand the exact bytes to the wallet. A transaction that would abort is stopped before the wallet opens, with the Move error in words.

## Verified (11 November 2026)

`pnpm verify` (`scripts/verify-mainnet.ts`) against Sui mainnet and Bitcoin mainnet, moving no money:

| Check | Result |
|---|---|
| The Esplora server is the chain Hashi watches (genesis hash = `bitcoin_chain_id` reversed) | PASS, `000000000019d668...` |
| Every BTC output Hashi holds paid the address the SDK derives from its Sui owner | PASS, 7 of 7 (the 8th is Hashi's own change output) |
| BTC held equals hBTC supply | PASS, 1,442,974,424 sats both |
| Re-recording a UTXO Hashi already holds aborts | PASS, `EUtxoAlreadyUsed` in `utxo_pool::assert_not_spent_or_active` |
| A real holder's withdrawal request succeeds | PASS, simulated only |

`pnpm e2e` (`scripts/e2e.ts`) runs the app in headless Chrome with a test wallet injected over Wallet Standard, the way Slush registers. The wallet carries the address of a real mainnet hBTC holder and never signs: it keeps the bytes it is asked to sign and declines. The script then simulates those bytes on mainnet.

| Check | Result |
|---|---|
| Live panel shows BTC held = hBTC minted | PASS |
| The deposit address on the page equals the SDK's derivation | PASS |
| The holder's real deposit shows as minted, in payments and in history | PASS |
| Record: a payment the app has never seen (Esplora's answer stubbed with one extra output) gets a Record button, and the bytes the wallet received simulate to `DepositRequested` for the holder, with the txid stored byte-reversed | PASS |
| Withdraw: 0.0003 BTC to the BIP-173 test address; the bytes simulate to `WithdrawalRequested` for 30,000 sats | PASS |
| A real mainnet withdrawal digest can be followed | PASS |
| Testnet shows the Signet address and the 1 BTC minimum | PASS |
| No sideways scroll at phone width | PASS |

Not yet verified: a real deposit and a real withdrawal executed from the live site with Slush (they need real BTC on mainnet), and cancel (it needs a pending withdrawal past its one hour cooldown).

## Deployed ids

| What | Mainnet | Testnet | How it was checked |
|---|---|---|---|
| Hashi package | `0xd30fb3f8914efdbeb7b8e85fae1d65dc584b44a1281f66737b92bb9f03a59d06` | `0x5e0b99c31f691742acea5de4ca1bf53c398d5639fed6503a51ffe8035dc68485` | Hashi's docs (`design/docs/reference/networks.mdx`) and `crates/hashi/src/constants.rs`; testnet is also the SDK's default |
| Hashi object | `0x8d110642d9b5133bd661cda4873edf135ab6b91ff6918601015880874b950e5d` | `0x342e908043db6090558ed7766df95bfc3609881b2eac7edb5343dd5bb3ddd1bb` | same, and `pnpm verify` decodes it and reads its reserve |
| hBTC type | `<package>::btc::BTC`, 8 decimals | same | `btc.move`, and GraphQL `coinMetadata` |
| Bitcoin network | Bitcoin mainnet | Bitcoin Signet (default signet) | `bitcoin_chain_id` on chain = the genesis hash, reversed |

SDK 0.6.29 has no mainnet defaults ("Hashi is not yet supported on Sui mainnet"), so Ferry passes the mainnet ids explicitly (`src/lib/networks.ts`). 0.6.30 ships the same code.

## Live values on mainnet (11 November 2026)

Minimum deposit and withdrawal 30,000 sats. 6 Bitcoin confirmations, then a 10 minute delay. Withdrawal cancel cooldown 1 hour. Worst-case miner fee 29,454 sats, so a minimum withdrawal can arrive as little as 546 sats. Committee of 105 validators. Guardian bucket 50 BTC, refilling about 50 BTC a day. 45 deposits and 26 withdrawals done.

Testnet: the minimum is 1 signet BTC, more than public Signet faucets give, so a class cannot deposit on testnet. Reads, addresses and tracking work there as on mainnet.

## Run it

Node 22+ and pnpm. A browser with Slush for writes.

```sh
pnpm install
pnpm dev                  # http://localhost:5294
pnpm build                # typecheck, then production build
pnpm verify               # mainnet checks, no money moves
pnpm e2e                  # browser checks against localhost; APP_URL=https://day3-ferry.vercel.app pnpm e2e for the live site
```

## Gotchas

- **The SDK is pre-1.0 and testnet-first.** Mainnet works with explicit ids. Pin the version.
- **Hashi does not scan Bitcoin.** Nothing happens until someone records the payment on Sui. Ferry finds payments for you; the CLI and SDK need the txid and vout.
- **Txids are byte-reversed.** Explorers show display order; Hashi stores internal order. Pass display order to the SDK, which reverses it. Get it wrong and the committee looks for a transaction that does not exist.
- **Anyone can record a deposit.** The hBTC goes to the derivation path, never to the sender. Of the 6 deposits recorded on mainnet on 11 November, 5 were sent by one address on behalf of their owners.
- **hBTC is an address balance.** `confirm_deposit` mints with `balance::send_funds`, so a fresh holder has no Coin objects. `tx.balance` draws from it for a withdrawal.
- **Below the minimum is stuck.** An output under 30,000 sats cannot be recorded, and the user's own keys cannot spend from the deposit address.
- **A deposit request can expire.** Hashi's source deletes requests not confirmed within a day. The BTC is still at the address; record it again.
- **The withdrawal fee is a worst case.** The protocol budgets `withdrawal_minimum - 546` sats for miner fees. The real fee is taken at batch time and is usually far lower.
- **Only P2WPKH and P2TR.** Withdrawals go to `bc1q` (20-byte) or `bc1p` (32-byte) addresses only.
- **Simulate first.** `deposit` and `request_withdrawal` are private `entry` functions with clear aborts. Simulating catches them before the wallet opens.

## Code map

- `src/lib/networks.ts`: both deployments, every id and how it was checked
- `src/lib/hashi.ts`: the Sui client extended with `hashi()`
- `src/lib/bitcoin.ts`: Esplora reads: payments to an address, confirmations, byte order
- `src/lib/protocol.ts`: committee, reserve, supply, queues and the latest requests, from GraphQL
- `src/lib/actions.ts`: the record, withdraw and cancel PTBs
- `src/lib/sign.ts`: build, simulate, sign with the wallet, execute
- `src/lib/track.ts`: the deposit and withdrawal steps, and the digests this browser follows
- `src/lib/wallet.tsx`: Wallet Standard, one Sui wallet
- `src/components/`: deposit, withdraw, live protocol and tracking cards
- `scripts/verify-mainnet.ts`, `scripts/e2e.ts`: the checks above
