# Day 3 Speaker Notes: Hashi on Sui

Keys, Dollars and Bitcoin, Day 3, SuiHub Lagos. Deck: teaching/Day3_Build_with_Hashi.pptx (13 slides, rebuilt with `pnpm slides`). Demo dApp: https://day3-ferry.vercel.app. Repo: https://github.com/Nuel-osas/day3-ferry. Hashi: https://github.com/MystenLabs/hashi.

## Before class

- Install Slush in the presenting browser, on mainnet.
- Open https://day3-ferry.vercel.app on Mainnet. The live card should show the same number for hBTC minted and BTC held, and "same chain as Hashi".
- Have two real digests ready to paste under Track: deposit 57SeRZ7xKmmRB6Tm1AgNV3Ngkb6b1VRnvzvfHbvYZP25 and withdrawal GUHmUvtZPvpEFTvavzM6HsCGab2Fid847UZAjLtTefa5.
- Students need a phone or laptop with Slush. For the last two hands-on steps: Node 22+, pnpm and the Sui CLI. Nobody needs BTC.

## Run of show (about two hours)

| Slides | Minutes | What happens |
|---|---|---|
| 1 to 3 | 15 | What Hashi is, the six parts |
| 4 to 6 | 25 | Why Hashi, its impact on Sui, what changed since mainnet |
| 7 to 8 | 20 | What mainnet means for developers, how to position yourself |
| 9 to 11 | 25 | The demo dApp (live), its code, a contract with its own Bitcoin address |
| 12 to 13 | 35 | Hands on, take home, questions |

## Sources

- Sui, "A New Era of Bitcoin-Based Finance Begins: Meet Hashi on Sui" (March 2026): https://www.sui.io/blog/new-era-of-bitcoin-based-finance-begins-meet-hashi
- Sui, "Hashi global coalition expands" (July 2026): https://www.sui.io/blog/hashi-global-coalition-expands
- Crypto Briefing, mainnet with $500M in capital backing, Anchorage Digital added (8 Oct 2026): https://cryptobriefing.com/hashi-mainnet-to-launch-with-500m-in-capital-backing-adds-anchorage-digital-to-coalition/
- Sui mainnet: Hashi's DepositConfirmed and WithdrawalRequested events, the UTXO pool and the hBTC supply, read on 11 and 12 Nov 2026.


## 01. hashi: Bitcoin on Sui, now on mainnet

EXPLAIN
Day 1 was keys, Day 2 was dollars, today is Bitcoin. Hashi went live on Sui mainnet in October. Today is about understanding it and seeing where you fit as a builder, then trying a working dApp on it.

SHOW / DO
Open https://day3-ferry.vercel.app on the projector, on Mainnet. Point at the live card: hBTC minted and BTC held, the same number.

ASK THE ROOM
Who here holds BTC? Where is it, and what does it do all day?

EXPECTED ANSWER
Mostly on an exchange or in a wallet, doing nothing. Using it anywhere else has meant selling it or handing it to a custodian.

TRANSITION
What Hashi is, in one sentence.

REFERENCES
https://day3-ferry.vercel.app ; https://github.com/MystenLabs/hashi

## 02. Lock on Bitcoin, mint on Sui, burn to release.

EXPLAIN
Compare with Day 2. CCTP could burn and mint USDC because Circle issues it. Nobody issues Bitcoin, so it cannot be burned: it has to be locked. The question is who holds the lock. In Hashi it is a threshold of Sui validators signing together (MPC) plus a guardian key, and every rule for when they sign lives in Move on Sui.

SHOW / DO
Draw it: Bitcoin on the left with a padlock address, Sui on the right with hBTC. Arrow right: deposit, 6 blocks, approve, delay, mint. Arrow left: burn, batch, sign, BTC.

ASK THE ROOM
If nobody can burn BTC, what stops the committee from walking away with it?

EXPECTED ANSWER
The address needs two signatures: the committee's threshold key and the guardian's. The guardian also rate-limits withdrawals, and the delays leave time to pause.

TRANSITION
The parts.

REFERENCES
https://github.com/MystenLabs/hashi (design/docs/user-flows.mdx)

## 03. The six parts

EXPLAIN
The committee is Sui's own validators running threshold MPC: 105 members on mainnet. The guardian is an independent signer in every deposit address and the rate limit on the way out. Every Sui address gets its own Bitcoin address. hBTC is a normal Sui coin. The delays are the safety net. There is no HASHI token: the committee governs by stake.

SHOW / DO
Ferry's live card: committee 105, guardian can sign 50 BTC now, refills about 50 BTC a day, 6 confirmations then 10 minutes.

ASK THE ROOM
Why a 10 minute delay after the committee already approved?

EXPECTED ANSWER
If a committee signature is ever wrong, operators have a window to pause before anything is minted.

TRANSITION
Why build this at all?

REFERENCES
https://github.com/MystenLabs/hashi/tree/main/design/docs ; packages/hashi/sources/btc/deposit.move

## 04. The problem it solves

EXPLAIN
Most Bitcoin does nothing. To use it you either sell it, or hand it to someone who issues a wrapped token, and you trust their reserves. Sui's own framing: synthetic Bitcoin products "lacked transparency on collateral management", so institutions stayed away. Hashi's answer is that the BTC never leaves Bitcoin, the keys are spread across Sui's validators plus a guardian, and the reserve can be checked by anyone: we checked it, and it matches to the satoshi.

SHOW / DO
In Ferry's live card: hBTC minted equals BTC held. Anyone can run that check from Sui GraphQL; scripts/verify-mainnet.ts does.

ASK THE ROOM
Why would someone borrow dollars against their BTC instead of selling it?

EXPECTED ANSWER
They keep their Bitcoin and its upside, they do not trigger a sale, and they get spending money now. In a weak currency that is exactly what a BTC holder wants.

TRANSITION
What Hashi does for Sui.

REFERENCES
https://www.sui.io/blog/new-era-of-bitcoin-based-finance-begins-meet-hashi ; scripts/verify-mainnet.ts

## 05. What Hashi brings to Sui

EXPLAIN
For Sui this is the biggest asset in crypto arriving as a native coin, secured by Sui's own validators. The launch coalition is the signal: more than $500 million in capital commitments and more than 20 launch partners, with Anchorage Digital added at Basecamp. Lending protocols named for day one: AlphaLend, Bluefin, Current, Scallop and Suilend, with NAVI slated for Hashi lending and Fluid joining. Institutions get custody routes (BitGo, Anchorage, Ledger), liquidity (FalconX, Cumberland, Bullish, Erebor), pricing (CF Benchmarks), insurance (Soter) and audits (Certora, OtterSec, Asymptotic). These are announcements; check each protocol for what is live before you build on it.

SHOW / DO
Open https://www.sui.io/blog/hashi-global-coalition-expands and scroll the partner list.

ASK THE ROOM
Which of these matters most for a small team in Lagos?

EXPECTED ANSWER
The lending markets. If hBTC is collateral on Suilend, Scallop or NAVI, your app can offer BTC-backed loans without running a lending protocol yourself.

TRANSITION
What actually changed since mainnet.

REFERENCES
https://www.sui.io/blog/new-era-of-bitcoin-based-finance-begins-meet-hashi ; https://www.sui.io/blog/hashi-global-coalition-expands ; https://cryptobriefing.com/hashi-mainnet-to-launch-with-500m-in-capital-backing-adds-anchorage-digital-to-coalition/

## 06. What changed since mainnet

EXPLAIN
At Basecamp on 8 October Sui said mainnet would open that month, in phases. The chain shows it: the first BTC deposit was recorded and minted on 22 October. Two weeks later, on 2 November, 9.5 BTC came in on one day, including a single 6 BTC deposit. By 12 November, 46 deposits had minted 14.44 BTC of hBTC to 24 different Sui addresses, and 27 withdrawals had gone back to Bitcoin. It is real and growing, and it is early: 24 holders means the app layer is almost empty.

SHOW / DO
In Ferry, "Latest on Hashi mainnet": the newest deposits and withdrawals, minutes or hours old. Follow one.

ASK THE ROOM
24 holders after three weeks. Is that good or bad news for you?

EXPECTED ANSWER
Good. The infrastructure is live and the apps are not built yet. That is the window.

TRANSITION
What this means for you as a developer.

REFERENCES
https://cryptobriefing.com/hashi-mainnet-to-launch-with-500m-in-capital-backing-adds-anchorage-digital-to-coalition/ ; Hashi events DepositConfirmed and WithdrawalRequested on Sui GraphQL

## 07. What Hashi mainnet means for you

EXPLAIN
Five things changed for a developer. One: real users with real BTC, on mainnet, from 30,000 sats. Two: an SDK, @mysten/hashi, with readers for everything and transaction builders your users sign in their own wallet (pre-1.0, pin it, and pass the mainnet ids yourself). Three: hBTC is just a Sui coin, so everything you know about Move applies. Four, the one only Sui has: any object can have its own Bitcoin address, so a contract can receive BTC directly. Five: the partners named the products they want: BTC-backed loans, vaults, structured products. Most of the consumer and local products are not on that list.

SHOW / DO
Open src/lib/hashi.ts and src/lib/actions.ts in the repo: the whole integration is two small files.

ASK THE ROOM
Which of these five could you start on tonight?

EXPECTED ANSWER
All of them read-only, on mainnet, with no BTC: addresses, protocol state, live deposits. And the Move part on testnet.

TRANSITION
How to position yourself.

REFERENCES
https://www.npmjs.com/package/@mysten/hashi ; https://github.com/MystenLabs/hashi/blob/main/design/docs/reference/networks.mdx

## 08. How to be early on Hashi

EXPLAIN
Learn it properly first: run Ferry, read the SDK and Hashi's deposit.move and withdraw.move. Build on what is free: mainnet reads and testnet Move cost nothing. Then pick a product the launch partners are not building, for users you understand. In Nigeria people already hold BTC as savings and trade it person to person: escrow for P2P trades, Bitcoin payment links for freelancers and merchants, BTC savings with a lock, and dollar loans against BTC through the lending markets. Plug into the partners rather than competing with them. And ship in public: a dashboard, a tracker, a tool other builders need.

SHOW / DO
Write the room's product ideas on the board under the five moves.

ASK THE ROOM
What Bitcoin problem do you or people you know have this month?

EXPECTED ANSWER
Common answers: selling BTC to pay bills, P2P scams, getting paid by foreign clients, saving against the naira. Each is a product.

TRANSITION
What a Hashi dApp looks like.

REFERENCES
https://github.com/Nuel-osas/day3-ferry ; https://github.com/MystenLabs/hashi

## 09. Ferry: what a Hashi dApp looks like

EXPLAIN
Ferry is the shape every Hashi app shares. Your Bitcoin address with a QR code. The Bitcoin payments to it, found by the app, because Hashi does not scan Bitcoin for you. Recording a payment on Sui, signed in the user's wallet. A tracker for the hour it takes. The way back, with the worst-case fee shown first. And the reserve check. What it must handle for users: the 30,000 sat minimum (below it, BTC is stuck), byte-reversed txids, requests that expire after a day, and the worst-case fee.

SHOW / DO
On https://day3-ferry.vercel.app: connect Slush, show the deposit address and QR, then follow 57SeRZ7xKmmRB6Tm1AgNV3Ngkb6b1VRnvzvfHbvYZP25 under Track to minted.

ASK THE ROOM
Which screen would you change for a Nigerian user?

EXPECTED ANSWER
Probably the amounts: show naira next to sats, and the minimum in naira before anyone sends.

TRANSITION
The code behind it.

REFERENCES
https://day3-ferry.vercel.app ; https://github.com/Nuel-osas/day3-ferry

## 10. The whole integration in one screen

EXPLAIN
Everything is under client.hashi after $extend(hashi()). On mainnet pass the package and object ids, from Hashi's docs. Use the tx builders, not the signing helpers, so the user's wallet signs and no key sits in your page. Pass txids the way explorers show them; the SDK reverses the bytes for Hashi.

SHOW / DO
Open src/lib/hashi.ts, src/lib/actions.ts and src/lib/sign.ts in the repo.

ASK THE ROOM
Where does the Bitcoin data come from, if the SDK only talks to Sui?

EXPECTED ANSWER
From any Bitcoin API. Ferry reads Esplora (blockstream.info, mempool.space) from the browser and checks first that it is the same chain Hashi watches.

TRANSITION
One level down: your own Move code.

REFERENCES
src/lib/hashi.ts ; src/lib/actions.ts ; src/lib/sign.ts

## 11. A contract with its own Bitcoin address

EXPLAIN
This is what only Hashi on Sui can do, and where local products come from. Hashi mints with balance::send_funds(btc, derivation_path), and the derivation path can be an object's ID. So a shared Jar object gets its own Bitcoin address, and BTC sent there becomes hBTC inside the jar. The jar releases it with withdraw_funds_from_object, only to its cap holder and only after unlock_ms. Swap the time lock for "seller confirms the naira arrived" and it is a P2P escrow; for "invoice paid" and it is a payment link.

SHOW / DO
Run move/jar on testnet (move/jar/README.md): publish, new, send_funds, take. Testnet take: 3StPb2xWLz4FiStur6z5dq3fvnUwwAsFgB1R8GQe2hM8.

ASK THE ROOM
What else could own a Bitcoin address this way?

EXPECTED ANSWER
An escrow for a P2P trade, an invoice, a savings pot, a DAO treasury, a loan vault. The rules for spending live in Move.

TRANSITION
Try it yourself.

REFERENCES
move/jar/README.md ; packages/hashi/sources/btc/deposit.move (confirm_deposit)

## 12. Try it now

EXPLAIN
Everyone can do the first three on their phone. The last two need a laptop. Nobody needs BTC: we read mainnet and follow other people's real deposits, and the jar runs on testnet with SUI standing in for hBTC.

SHOW / DO
Walk the room through each step on the projector, then give them 20 minutes. Real digests to follow: deposit 57SeRZ7xKmmRB6Tm1AgNV3Ngkb6b1VRnvzvfHbvYZP25, withdrawal GUHmUvtZPvpEFTvavzM6HsCGab2Fid847UZAjLtTefa5.

ASK THE ROOM
Whose Bitcoin address starts with bc1p? Why does everyone's?

EXPECTED ANSWER
Everyone's does: Hashi deposit addresses are Taproot (P2TR), and Taproot addresses on Bitcoin mainnet start with bc1p.

TRANSITION
Take home.

REFERENCES
https://day3-ferry.vercel.app ; https://github.com/Nuel-osas/day3-ferry ; move/jar/README.md

## 13. The rails are live. The apps are not built yet.

EXPLAIN
Close on the opportunity: the infrastructure, the partners and the SDK exist; the products for ordinary users, especially local ones, do not.

SHOW / DO
Leave the repo link and the live app on screen while people ask questions.

ASK THE ROOM
What will you build first?

EXPECTED ANSWER
Collect three ideas from the room and say which part of today each one uses.

TRANSITION
Questions.

REFERENCES
https://github.com/Nuel-osas/day3-ferry ; https://day3-ferry.vercel.app
