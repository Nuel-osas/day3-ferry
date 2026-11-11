# Day 3 Speaker Notes: Build with Hashi

Keys, Dollars and Bitcoin, Day 3, SuiHub Lagos. Deck: teaching/Day3_Build_with_Hashi.pptx (13 slides, rebuilt with `pnpm slides`). Class app: https://day3-ferry.vercel.app. Repo: https://github.com/Nuel-osas/day3-ferry. Hashi: https://github.com/MystenLabs/hashi.

## Before class

- Install Slush in the presenting browser, on mainnet, with a little SUI for gas.
- Open https://day3-ferry.vercel.app on Mainnet. The live card should read the same number for hBTC minted and BTC held, and "same chain as Hashi".
- For a live deposit: send at least 30,000 sats (0.001 BTC is comfortable) from your own Bitcoin wallet to your Ferry deposit address at least 80 minutes before the class, record it in Ferry, and follow it. It needs 6 blocks and a 10 minute delay. Set OUR_DEPOSIT to its digest and rerun `pnpm slides` to fill the last row of slide 12.
- Have a real deposit and withdrawal digest ready to paste: 57SeRZ7xKmmRB6Tm1AgNV3Ngkb6b1VRnvzvfHbvYZP25 and GUHmUvtZPvpEFTvavzM6HsCGab2Fid847UZAjLtTefa5.
- Students need Node 22+, pnpm, a browser with Slush, and the Sui CLI for the jar. Nobody needs BTC to follow along.

## Run of show (about two hours)

| Slides | Minutes | What happens |
|---|---|---|
| 1 to 4 | 20 | What Hashi is, the parts, mainnet and testnet |
| 5 to 8 | 30 | The SDK, your address, a deposit, recording from the browser (live in Ferry) |
| 9 to 10 | 15 | Withdrawals and the tracker (follow real digests) |
| 11 | 25 | The jar: a Move object with its own Bitcoin address (publish and run on testnet) |
| 12 to 13 | 10 | Proof, gotchas, take home |
| hands on | 20 | Everyone connects Slush, finds their Bitcoin address, follows a live deposit, derives their jar's address |


## 01. ferry: Build with Hashi

EXPLAIN
Day 1 was keys, Day 2 was dollars, today is Bitcoin. Hashi is Mysten's native Bitcoin bridge for Sui, live on mainnet. We do not rebuild it. We use it, the way Day 2 used Circle's CCTP: the SDK, an app on top, and our own Move code that holds hBTC.

SHOW / DO
Open https://day3-ferry.vercel.app on the projector, on Mainnet. Point at the live card: hBTC minted and BTC held, the same number. Ask the room to clone https://github.com/Nuel-osas/day3-ferry and run pnpm install while you talk.

ASK THE ROOM
Who here holds BTC? Where is it, and what does it do all day?

EXPECTED ANSWER
Mostly on an exchange or in a wallet, doing nothing. Using it anywhere else has meant handing it to a custodian or a wrapped-token bridge.

TRANSITION
The one idea.

REFERENCES
https://day3-ferry.vercel.app ; https://github.com/Nuel-osas/day3-ferry ; https://github.com/MystenLabs/hashi

## 02. Lock on Bitcoin, mint on Sui, burn to release.

EXPLAIN
Compare with Day 2. CCTP could burn and mint because Circle issues USDC. Nobody issues Bitcoin, so it cannot be burned: it must be locked. The question is who holds the lock. In Hashi it is a threshold of Sui validators (MPC), plus a guardian key, and the rules live in Move on Sui. The supply check is ours: the BTC in Hashi's UTXO pool and the hBTC supply, both read from chain, equal to the satoshi.

SHOW / DO
Draw it: Bitcoin on the left with a padlock address, Sui on the right with hBTC. Arrow right: deposit, 6 blocks, approve, delay, mint. Arrow left: burn, batch, sign, BTC.

ASK THE ROOM
If nobody can burn BTC, what stops the committee from spending the locked BTC?

EXPECTED ANSWER
The address needs two signatures: the committee's threshold key and the guardian's. The guardian also rate-limits withdrawals. And every rule for when they sign is Move code on Sui, with delays that leave time to pause.

TRANSITION
The parts of Hashi.

REFERENCES
https://github.com/MystenLabs/hashi (design/docs/user-flows.mdx) ; scripts/verify-mainnet.ts

## 03. What Hashi is made of

EXPLAIN
Six parts. The committee is Sui's own validators running threshold MPC: 105 members on mainnet. The guardian is an independent signer in every deposit address and the rate limiter on the way out. Your address is derived from both keys and your Sui address. hBTC is a normal Sui coin with 8 decimals, minted into your address balance. The delays are the safety: 6 confirmations, then a 10 minute window in which a bad approval can be caught and the service paused. There is no HASHI token: the committee governs by stake.

SHOW / DO
Ferry's live card: committee 105, guardian can sign 50 BTC now and refills about 50 BTC a day, 6 confirmations then 10 min.

ASK THE ROOM
Why a 10 minute delay after the committee already approved?

EXPECTED ANSWER
Defence in depth. If a committee signature is ever wrong, operators have a window to pause before anything is minted. Paused, confirm_deposit is rejected and the approval waits.

TRANSITION
Mainnet and testnet, side by side.

REFERENCES
https://github.com/MystenLabs/hashi/tree/main/design/docs ; packages/hashi/sources/btc/deposit.move

## 04. Hashi on mainnet and testnet

EXPLAIN
Hashi is live on mainnet, in a phased rollout. The TypeScript SDK (0.6.29) only has testnet defaults and throws on mainnet unless you pass the package and object ids, which Hashi's own docs list. The minimums are the big difference: 30,000 sats on mainnet, but 1 whole signet BTC on testnet, more than any faucet gives. So today we read everything on both, and real deposits happen on mainnet with real BTC.

SHOW / DO
Flip Ferry between Mainnet and Testnet. The deposit address changes prefix: bc1p on mainnet, tb1p on Signet, same Sui address.

ASK THE ROOM
The worst-case fee on testnet is 0.99999454 BTC. Is testnet expensive?

EXPECTED ANSWER
No. The fee budget is defined as the withdrawal minimum minus 546 sats of dust, so it tracks the minimum. It is a ceiling the batch verifier enforces, not a price. The real fee is taken at batch time.

TRANSITION
The SDK in one screen.

REFERENCES
https://github.com/MystenLabs/hashi/blob/main/design/docs/reference/networks.mdx ; src/lib/networks.ts

## 05. The stack in one screen

EXPLAIN
Everything is under client.hashi after $extend(hashi()). The SDK also has deposit() and requestWithdrawal() that sign for you, but they want a raw Signer, which means a key in the page. In an app, use the tx builders and let the user's wallet sign. call gives you Move-call thunks to put inside your own PTB, which is how Ferry's cancel sends the refund back to the address balance.

SHOW / DO
Open src/lib/hashi.ts (the client) and src/lib/actions.ts (the three PTBs).

ASK THE ROOM
Why does the SDK ask for the txid in display order and then reverse it?

EXPECTED ANSWER
Explorers and wallets show txids byte-reversed from how Bitcoin hashes them. Hashi stores the internal order, so the committee looks up the right transaction. Pass what mempool.space shows.

TRANSITION
Your Bitcoin address.

REFERENCES
https://www.npmjs.com/package/@mysten/hashi ; src/lib/hashi.ts ; src/lib/actions.ts

## 06. Your Bitcoin address

EXPLAIN
The address is Taproot with an unspendable internal key, so every spend goes through a script. Leaf one: 2 of 2, the guardian's key and an MPC child key derived from the committee's master key and your Sui address. Leaf two: the MPC key alone, after a delay, for recovery. Your Sui address is baked in, so the deposit can only ever mint to you. We checked this against mainnet: for all 7 deposits Hashi holds, the address their BTC paid is exactly what the SDK derives from their owner.

SHOW / DO
In Ferry, type any Sui address into "look at any Sui address": its Bitcoin address appears. Paste the same address again: same Bitcoin address.

ASK THE ROOM
Someone sends 10,000 sats to their deposit address. What happens?

EXPECTED ANSWER
Nothing, forever. It is under the 30,000 sat minimum, so it cannot be recorded, and the user's own keys cannot spend from that address. Show the minimum before anyone sends.

TRANSITION
A deposit, step by step.

REFERENCES
https://github.com/MystenLabs/hashi/blob/main/design/docs/address-scheme.mdx ; scripts/verify-mainnet.ts

## 07. BTC in, hBTC out

EXPLAIN
Two things surprise people. First, Hashi does not scan Bitcoin: nothing happens until someone records the payment on Sui. Second, anyone can record it. The hBTC always goes to the derivation path baked into the address, never to whoever paid the gas, so a service can record for its users: 5 of the 6 mainnet deposits on 11 November were sent by one address on behalf of their owners. After recording, the committee watches Bitcoin, approves at 6 confirmations, and anyone can confirm after the delay, which mints.

SHOW / DO
Follow a real one in Ferry: paste 57SeRZ7xKmmRB6Tm1AgNV3Ngkb6b1VRnvzvfHbvYZP25 under Track. Every step is done, with the approval time.

ASK THE ROOM
Can you record the deposit before it has any confirmations?

EXPECTED ANSWER
Yes, right after broadcast. The committee waits for 6 confirmations before approving. But a request not confirmed within a day can expire, so do not record a transaction stuck in the mempool for days.

TRANSITION
Doing it from the browser.

REFERENCES
packages/hashi/sources/btc/deposit.move ; src/lib/track.ts

## 08. Record it from the browser

EXPLAIN
Ferry has no server. It reads Bitcoin from Esplora (blockstream.info, mempool.space), which allows browser requests, and checks first that Esplora's genesis block is the chain Hashi stores; otherwise recording stays off. It lists every output that paid the address. Then one PTB per Bitcoin transaction, three Move calls per output. Before the wallet opens, Ferry simulates the exact bytes: if the output was already used, the simulation says EUtxoAlreadyUsed and nobody is asked to sign a failure.

SHOW / DO
Open the Deposit card on the live site with a wallet connected: the payment list, the Record button, and the PTB line under it.

ASK THE ROOM
Why build the bytes ourselves instead of handing the wallet a half-built transaction?

EXPECTED ANSWER
So we can simulate exactly what will be signed, and so the wallet signs exactly that. Our test wallet received these bytes, and they simulate on mainnet to DepositRequested.

TRANSITION
The way back.

REFERENCES
src/lib/bitcoin.ts ; src/lib/actions.ts ; src/lib/sign.ts

## 09. The way back to Bitcoin

EXPLAIN
A withdrawal locks hBTC in a request with your Bitcoin address (bc1q or bc1p only). The committee approves it, puts it in a Bitcoin batch, where the hBTC is burned and Hashi's UTXOs are locked, collects the MPC signatures and the guardian's, and confirms once Bitcoin does. Until the batch you can cancel, but only after a 1 hour cooldown. The miner fee comes out of your amount. Its budget is the minimum minus dust, so at the minimum a withdrawal could arrive as 546 sats in the worst case. Show the worst case before the user signs.

SHOW / DO
Follow GUHmUvtZPvpEFTvavzM6HsCGab2Fid847UZAjLtTefa5 in Ferry: five steps, then the Bitcoin txid and its confirmations.

ASK THE ROOM
Why is there a cancel cooldown at all?

EXPECTED ANSWER
So the committee is not racing users. A request the committee is about to batch should not vanish under it; after an hour, an unbatched request can be taken back.

TRANSITION
What the user sees while they wait.

REFERENCES
packages/hashi/sources/btc/withdraw.move ; src/components/WithdrawCard.tsx

## 10. An hour of waiting is a state, not an error

EXPLAIN
The longest part is Bitcoin itself: 6 blocks is about an hour. The tracker keeps the user calm and stops them from doing something twice. Ferry follows any digest, not just yours, and reads your own deposits and withdrawals back from the chain's index, so a new device sees everything. The browser only remembers which digests you asked to follow. If a request expires (not confirmed within a day), nothing was minted and the BTC is still at the address: record it again.

SHOW / DO
In Ferry, click Follow on a deposit under "Latest on Hashi mainnet": watch the confirmations count, then the approval time, then the delay countdown.

ASK THE ROOM
The committee approved, the delay is over, but no hBTC yet. Failed?

EXPECTED ANSWER
No. Someone still has to call confirm_deposit, which is what mints; the committee's nodes do it. Show "minting next" and keep polling.

TRANSITION
Part 4: hBTC in your own Move code.

REFERENCES
src/lib/track.ts ; packages/hashi/sources/btc/deposit_queue.move

## 11. A contract with its own Bitcoin address

EXPLAIN
This is what only Hashi on Sui can do. Hashi mints with balance::send_funds(btc, derivation_path), and the derivation path can be an object's ID. So a shared Jar object gets its own Bitcoin address, and BTC sent there becomes hBTC inside the jar, not in anyone's wallet. The jar releases it with withdraw_funds_from_object, only to the cap holder and only after unlock_ms: a Bitcoin savings jar with a time lock enforced on Sui. It is generic over the coin, so we tested the same path on testnet with SUI: funded with send_funds, take before unlock aborted, take after unlock worked.

SHOW / DO
Run move/jar/README.md on testnet: publish, new, send_funds, take. Then derive the jar's Bitcoin address with generateDepositAddress({ suiAddress: jarId }). Testnet transactions: fund FQLAhzyrsNW62Q27fKdvJJtNhauyDkB326jA4w5eXp6B, take 3StPb2xWLz4FiStur6z5dq3fvnUwwAsFgB1R8GQe2hM8.

ASK THE ROOM
What else could own a Bitcoin address this way?

EXPECTED ANSWER
Anything with an ID: a DAO treasury, an escrow for a trade, a loan vault that takes BTC as collateral, a payroll pot. The rules for spending live in Move.

TRANSITION
Proof.

REFERENCES
move/jar/README.md ; packages/hashi/sources/btc/deposit.move (confirm_deposit)

## 12. Proof: real transactions and checks

EXPLAIN
pnpm verify reads mainnet: Esplora is Hashi's chain, 7 of 7 held deposits paid the derived address, BTC held equals hBTC supply, a used UTXO aborts. pnpm e2e drives https://day3-ferry.vercel.app with a test wallet carrying a real holder's address that never signs: it keeps the bytes the app hands it, and those bytes simulate on mainnet to DepositRequested and WithdrawalRequested. The deposit and withdrawal rows are other people's real mainnet transactions that Ferry follows.

SHOW / DO
Open the 0.02 BTC deposit on Suiscan, then its Bitcoin transaction on mempool.space: the output pays the address Ferry shows for that Sui address.

ASK THE ROOM
Why simulate instead of just sending a real transaction in the test?

EXPECTED ANSWER
A real deposit needs real BTC and an hour. Simulation runs the same Move code against live mainnet state and costs nothing, so it can run on every change.

TRANSITION
What will bite you.

REFERENCES
https://github.com/Nuel-osas/day3-ferry#verified-11-november-2026 ; move/jar/README.md

## 13. Six things that will bite you

EXPLAIN
Two of these cost users money: the minimum (BTC below it is stuck at an address they cannot spend) and the fee at the minimum. The rest cost you time.

SHOW / DO
README "Gotchas" in the repo has the full list with the reasons.

ASK THE ROOM
Which one would you put in red on the deposit screen?

EXPECTED ANSWER
The minimum. Show it next to the address and the QR code, before anyone sends.

TRANSITION
Hands on: everyone opens Ferry, connects Slush, finds their own Bitcoin address, and follows a live deposit.

REFERENCES
https://github.com/Nuel-osas/day3-ferry README "Gotchas"
