// Day 3 deck: Build with Hashi (13 slides) and speaker notes. Run: pnpm slides
// How to use the Hashi stack: what Hashi is, the SDK, an app on it (Ferry), and hBTC in your own
// Move code (move/jar). Facts read from Sui mainnet, Bitcoin mainnet and Hashi's source on
// 11 Nov 2026 (README "Verified", scripts/verify-mainnet.ts, move/jar/README.md).
const path = require('node:path');
const { createDeck, assets } = require('./deck-kit.cjs');

const LIVE = 'https://day3-ferry.vercel.app';
const REPO = 'https://github.com/Nuel-osas/day3-ferry';
const HASHI = 'https://github.com/MystenLabs/hashi';
const SDK = 'https://www.npmjs.com/package/@mysten/hashi';
const OUT = process.env.SLIDES_OUT || path.join(__dirname, 'Day3_Build_with_Hashi.pptx');
const NOTES = path.join(__dirname, 'day3-speaker-notes.md');

// Real transactions. A row whose id is missing prints as pending, never as done.
const RUN = {
	deposit: '57SeRZ7xKmmRB6Tm1AgNV3Ngkb6b1VRnvzvfHbvYZP25', // someone's 0.02 BTC deposit, recorded 14:12, minted 15:24 UTC, 11 Nov
	withdrawal: 'GUHmUvtZPvpEFTvavzM6HsCGab2Fid847UZAjLtTefa5', // someone's 0.0003 BTC withdrawal, 11 Nov, confirmed on Bitcoin
	jarFund: 'FQLAhzyrsNW62Q27fKdvJJtNhauyDkB326jA4w5eXp6B', // send_funds 0.01 SUI to the jar's id, testnet
	jarTake: '3StPb2xWLz4FiStur6z5dq3fvnUwwAsFgB1R8GQe2hM8', // take after unlock, testnet
	ours: process.env.OUR_DEPOSIT || '', // our own mainnet deposit through Ferry, if one is made before class
};
const short = (h) => (h && h.length > 50 ? `${h.slice(0, 18)}...${h.slice(-12)}` : h);

const d = createDeck({
	title: 'Build with Hashi: Bitcoin as a Sui Asset',
	subject: 'Keys, Dollars and Bitcoin, Day 3, SuiHub Lagos, November 2026',
	footerLeft: 'KEYS, DOLLARS AND BITCOIN · SUIHUB LAGOS',
	footerRight: 'DAY 3 · BUILD WITH HASHI',
	total: 13,
	glow: path.join(assets, 'cover-glow.png'),
});

// 01 Cover
d.cover({
	glyph: '≈',
	name: 'ferry',
	subtitle: 'Build with Hashi',
	blurb: 'Bitcoin as a Sui asset. Your BTC stays on Bitcoin and hBTC moves on Sui. Today: the Hashi SDK, an app your users can trust for the hour a deposit takes, and a Move object with its own Bitcoin address.',
	link: LIVE,
	label: '[ KEYS, DOLLARS AND BITCOIN · DAY 3 · SUIHUB LAGOS ]',
	note: {
		explain: 'Day 1 was keys, Day 2 was dollars, today is Bitcoin. Hashi is Mysten\'s native Bitcoin bridge for Sui, live on mainnet. We do not rebuild it. We use it, the way Day 2 used Circle\'s CCTP: the SDK, an app on top, and our own Move code that holds hBTC.',
		show: `Open ${LIVE} on the projector, on Mainnet. Point at the live card: hBTC minted and BTC held, the same number. Ask the room to clone ${REPO} and run pnpm install while you talk.`,
		ask: 'Who here holds BTC? Where is it, and what does it do all day?',
		answer: 'Mostly on an exchange or in a wallet, doing nothing. Using it anywhere else has meant handing it to a custodian or a wrapped-token bridge.',
		next: 'The one idea.',
		refs: `${LIVE} ; ${REPO} ; ${HASHI}`,
	},
});

// 02 The one idea
d.statement({
	eyebrow: 'THE ONE IDEA',
	line1: 'Lock on Bitcoin, mint on Sui, burn to release.',
	line2: 'Hashi does all three.\nYou build what the user touches.',
	body: 'Your BTC goes to a Taproot address that Sui\'s validator committee and an independent guardian control together. After 6 confirmations the committee approves it on Sui, and after a 10 minute safety delay hBTC is minted, one for one. Burn hBTC and the committee sends BTC back. On 11 November Hashi held 14.42974424 BTC against 14.42974424 hBTC.',
	note: {
		explain: 'Compare with Day 2. CCTP could burn and mint because Circle issues USDC. Nobody issues Bitcoin, so it cannot be burned: it must be locked. The question is who holds the lock. In Hashi it is a threshold of Sui validators (MPC), plus a guardian key, and the rules live in Move on Sui. The supply check is ours: the BTC in Hashi\'s UTXO pool and the hBTC supply, both read from chain, equal to the satoshi.',
		show: 'Draw it: Bitcoin on the left with a padlock address, Sui on the right with hBTC. Arrow right: deposit, 6 blocks, approve, delay, mint. Arrow left: burn, batch, sign, BTC.',
		ask: 'If nobody can burn BTC, what stops the committee from spending the locked BTC?',
		answer: 'The address needs two signatures: the committee\'s threshold key and the guardian\'s. The guardian also rate-limits withdrawals. And every rule for when they sign is Move code on Sui, with delays that leave time to pause.',
		next: 'The parts of Hashi.',
		refs: `${HASHI} (design/docs/user-flows.mdx) ; scripts/verify-mainnet.ts`,
	},
});

// 03 What Hashi is
{
	const s = d.slide({
		eyebrow: 'THE PROTOCOL',
		title: 'What Hashi is made of',
		subtitle: 'From Hashi\'s docs and Move source, with the live numbers from mainnet on 11 November.',
		note: {
			explain: 'Six parts. The committee is Sui\'s own validators running threshold MPC: 105 members on mainnet. The guardian is an independent signer in every deposit address and the rate limiter on the way out. Your address is derived from both keys and your Sui address. hBTC is a normal Sui coin with 8 decimals, minted into your address balance. The delays are the safety: 6 confirmations, then a 10 minute window in which a bad approval can be caught and the service paused. There is no HASHI token: the committee governs by stake.',
			show: `Ferry's live card: committee 105, guardian can sign 50 BTC now and refills about 50 BTC a day, 6 confirmations then 10 min.`,
			ask: 'Why a 10 minute delay after the committee already approved?',
			answer: 'Defence in depth. If a committee signature is ever wrong, operators have a window to pause before anything is minted. Paused, confirm_deposit is rejected and the approval waits.',
			next: 'Mainnet and testnet, side by side.',
			refs: `${HASHI}/tree/main/design/docs ; packages/hashi/sources/btc/deposit.move`,
		},
	});
	d.grid(s, [
		{ title: 'Committee', body: '105 Sui validators sign Bitcoin transactions with threshold MPC. No single key holds the BTC.' },
		{ title: 'Guardian', body: 'A second key in every deposit address, and a rate limit out: a 50 BTC bucket, about 50 a day.' },
		{ title: 'Your address', body: 'One Taproot address per Sui address, from the MPC key, the guardian key and your Sui address.' },
		{ title: 'hBTC', body: 'An 8-decimal Sui coin, minted with send_funds into your address balance. One per BTC held.' },
		{ title: 'Delays', body: '6 Bitcoin confirmations, a 10 minute window to pause a bad approval, a 1 hour cancel cooldown.' },
		{ title: 'Governance', body: 'No HASHI token. Committee members vote with stake on pauses, minimums and upgrades.' },
	], { y: 2.6, h: 1.95 });
}

// 04 Live on mainnet
{
	const s = d.slide({
		eyebrow: 'READ FROM CHAIN, 11 NOVEMBER',
		title: 'Hashi on mainnet and testnet',
		subtitle: 'view.all(), view.withdrawalFees() and Sui GraphQL. Testnet pairs with Bitcoin Signet.',
		note: {
			explain: 'Hashi is live on mainnet, in a phased rollout. The TypeScript SDK (0.6.29) only has testnet defaults and throws on mainnet unless you pass the package and object ids, which Hashi\'s own docs list. The minimums are the big difference: 30,000 sats on mainnet, but 1 whole signet BTC on testnet, more than any faucet gives. So today we read everything on both, and real deposits happen on mainnet with real BTC.',
			show: 'Flip Ferry between Mainnet and Testnet. The deposit address changes prefix: bc1p on mainnet, tb1p on Signet, same Sui address.',
			ask: 'The worst-case fee on testnet is 0.99999454 BTC. Is testnet expensive?',
			answer: 'No. The fee budget is defined as the withdrawal minimum minus 546 sats of dust, so it tracks the minimum. It is a ceiling the batch verifier enforces, not a price. The real fee is taken at batch time.',
			next: 'The SDK in one screen.',
			refs: `${HASHI}/blob/main/design/docs/reference/networks.mdx ; src/lib/networks.ts`,
		},
	});
	d.table(s, [
		['', 'Mainnet', 'Testnet'],
		['Bitcoin side', 'Bitcoin mainnet', 'Bitcoin Signet'],
		['Hashi package', '0xd30f...9d06', '0x5e0b...8485'],
		['Minimum in and out', '30,000 sats', '1 BTC (100,000,000 sats)'],
		['Confirmations, then delay', '6, then 10 minutes', '6, then 10 minutes'],
		['Miner fee budget per withdrawal', '29,454 sats', '99,999,454 sats'],
		['BTC held and hBTC minted', '14.42974424 and 14.42974424', 'read the same way'],
		['SDK 0.6.29 defaults', 'none: pass the ids', 'built in'],
	], { widths: [3.6, 4.0, 3.95], rowH: 0.47, size: 13.5 });
}

// 05 The stack
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: '@MYSTEN/HASHI 0.6.29',
		title: 'The stack in one screen',
		subtitle: 'The SDK extends any Sui client. tx builds unsigned PTBs, call gives Move calls, view reads.',
		note: {
			explain: 'Everything is under client.hashi after $extend(hashi()). The SDK also has deposit() and requestWithdrawal() that sign for you, but they want a raw Signer, which means a key in the page. In an app, use the tx builders and let the user\'s wallet sign. call gives you Move-call thunks to put inside your own PTB, which is how Ferry\'s cancel sends the refund back to the address balance.',
			show: 'Open src/lib/hashi.ts (the client) and src/lib/actions.ts (the three PTBs).',
			ask: 'Why does the SDK ask for the txid in display order and then reverse it?',
			answer: 'Explorers and wallets show txids byte-reversed from how Bitcoin hashes them. Hashi stores the internal order, so the committee looks up the right transaction. Pass what mempool.space shows.',
			next: 'Your Bitcoin address.',
			refs: `${SDK} ; src/lib/hashi.ts ; src/lib/actions.ts`,
		},
	});
	d.code(s, [
		"const client = new SuiGrpcClient({ network: 'mainnet', baseUrl }).$extend(",
		"  hashi({ hashiObjectId, packageId, bitcoinNetwork: 'mainnet' }),  // mainnet: pass the ids",
		');',
		'',
		'client.hashi.generateDepositAddress({ suiAddress })    // your Bitcoin address',
		'client.hashi.view.all()                                // minimums, confirmations, delays, paused',
		'client.hashi.view.findUsedUtxos([{ txid, vout }])      // already recorded?',
		'client.hashi.view.depositStatus(digest)                // pending, confirmed, expired',
		'client.hashi.view.transactionHistory(address)          // deposits and withdrawals',
		'client.hashi.tx.deposit({ txid, utxos, recipient })    // unsigned PTB: the wallet signs',
		'client.hashi.tx.requestWithdrawal({ amount, bitcoinAddress })',
		'client.hashi.call.cancelWithdrawal({ requestId })      // a Move call for your own PTB',
		'client.hashi.guardian.canWithdraw(sats)                // the rate limiter',
	].join('\n'), { size: 11, y: 2.78, h: 4.05 });
}

// 06 Your Bitcoin address
{
	const s = d.slide({
		eyebrow: 'ONE ADDRESS PER SUI ADDRESS',
		title: 'Your Bitcoin address',
		subtitle: 'generateDepositAddress({ suiAddress }): the same address every time, and nobody\'s keys but Hashi\'s can spend it.',
		note: {
			explain: 'The address is Taproot with an unspendable internal key, so every spend goes through a script. Leaf one: 2 of 2, the guardian\'s key and an MPC child key derived from the committee\'s master key and your Sui address. Leaf two: the MPC key alone, after a delay, for recovery. Your Sui address is baked in, so the deposit can only ever mint to you. We checked this against mainnet: for all 7 deposits Hashi holds, the address their BTC paid is exactly what the SDK derives from their owner.',
			show: 'In Ferry, type any Sui address into "look at any Sui address": its Bitcoin address appears. Paste the same address again: same Bitcoin address.',
			ask: 'Someone sends 10,000 sats to their deposit address. What happens?',
			answer: 'Nothing, forever. It is under the 30,000 sat minimum, so it cannot be recorded, and the user\'s own keys cannot spend from that address. Show the minimum before anyone sends.',
			next: 'A deposit, step by step.',
			refs: `${HASHI}/blob/main/design/docs/address-scheme.mdx ; scripts/verify-mainnet.ts`,
		},
	});
	d.compare(s,
		{ title: 'How it is built', bullets: ['Taproot, internal key unspendable (NUMS)', 'Leaf 1: guardian key and MPC child key, 2 of 2', 'Leaf 2: MPC key alone, after a delay (recovery)', 'Child key = derive(MPC master key, your Sui address)'] },
		{ title: 'What it means for your app', bullets: ['Same address for the same Sui address, always', 'The user\'s own keys cannot spend from it', 'Below 30,000 sats a payment is stuck: say so', 'Checked: 7 of 7 held deposits match the SDK'] },
		{ y: 2.6, h: 4.15 });
}

// 07 A deposit, step by step
{
	const s = d.slide({
		eyebrow: 'DEPOSIT',
		title: 'BTC in, hBTC out',
		subtitle: 'On 11 November, mainnet deposits took 40 minutes to 2 and a half hours from record to mint.',
		note: {
			explain: 'Two things surprise people. First, Hashi does not scan Bitcoin: nothing happens until someone records the payment on Sui. Second, anyone can record it. The hBTC always goes to the derivation path baked into the address, never to whoever paid the gas, so a service can record for its users: 5 of the 6 mainnet deposits on 11 November were sent by one address on behalf of their owners. After recording, the committee watches Bitcoin, approves at 6 confirmations, and anyone can confirm after the delay, which mints.',
			show: `Follow a real one in Ferry: paste ${RUN.deposit} under Track. Every step is done, with the approval time.`,
			ask: 'Can you record the deposit before it has any confirmations?',
			answer: 'Yes, right after broadcast. The committee waits for 6 confirmations before approving. But a request not confirmed within a day can expire, so do not record a transaction stuck in the mempool for days.',
			next: 'Doing it from the browser.',
			refs: 'packages/hashi/sources/btc/deposit.move ; src/lib/track.ts',
		},
	});
	d.steps(s, [
		{ title: 'Send', body: 'From any Bitcoin wallet to your deposit address. At least 30,000 sats per output.' },
		{ title: 'Record', body: 'deposit::deposit on Sui with the txid and vout. Anyone can send it; hBTC goes to you.' },
		{ title: 'Confirm', body: '6 Bitcoin blocks, about an hour. The committee watches Bitcoin, not you.' },
		{ title: 'Approve', body: 'The committee signs over the request and records the approval time on Sui.' },
		{ title: 'Mint', body: 'After the 10 minute delay, confirm_deposit sends hBTC to your address balance.' },
	], { y: 3.0, h: 3.4, bodySize: 14.5 });
}

// 08 Record from the browser
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'SRC/LIB/BITCOIN.TS · ACTIONS.TS · SIGN.TS',
		title: 'Record it from the browser',
		subtitle: 'Abridged from Ferry. Find the payment, build the PTB, simulate, then the user\'s wallet signs.',
		note: {
			explain: 'Ferry has no server. It reads Bitcoin from Esplora (blockstream.info, mempool.space), which allows browser requests, and checks first that Esplora\'s genesis block is the chain Hashi stores; otherwise recording stays off. It lists every output that paid the address. Then one PTB per Bitcoin transaction, three Move calls per output. Before the wallet opens, Ferry simulates the exact bytes: if the output was already used, the simulation says EUtxoAlreadyUsed and nobody is asked to sign a failure.',
			show: 'Open the Deposit card on the live site with a wallet connected: the payment list, the Record button, and the PTB line under it.',
			ask: 'Why build the bytes ourselves instead of handing the wallet a half-built transaction?',
			answer: 'So we can simulate exactly what will be signed, and so the wallet signs exactly that. Our test wallet received these bytes, and they simulate on mainnet to DepositRequested.',
			next: 'The way back.',
			refs: 'src/lib/bitcoin.ts ; src/lib/actions.ts ; src/lib/sign.ts',
		},
	});
	d.code(s, [
		'// 1. Hashi does not scan Bitcoin: find the outputs that paid the address',
		'const txs = await fetch(`${esplora}/address/${address}/txs`).then((r) => r.json());',
		'const outs = txs[0].vout',
		'  .map((o, vout) => ({ vout, amountSats: BigInt(o.value), to: o.scriptpubkey_address }))',
		'  .filter((o) => o.to === address);',
		'',
		'// 2. one PTB per Bitcoin transaction (txid as explorers show it)',
		'const tx = client.hashi.tx.deposit({ txid: `0x${txs[0].txid}`, utxos: outs, recipient: me });',
		'',
		'// 3. simulate the exact bytes, then the wallet signs them',
		'tx.setSender(me);',
		'const bytes = await tx.build({ client });',
		'await client.core.simulateTransaction({ transaction: bytes, include: { effects: true } });',
		"await wallet.features['sui:signTransaction'].signTransaction({ transaction: Transaction.from(bytes), account, chain });",
	].join('\n'), { size: 10.5, y: 2.78, h: 4.05 });
}

// 09 Withdraw
{
	const s = d.slide({
		eyebrow: 'WITHDRAW',
		title: 'The way back to Bitcoin',
		subtitle: 'tx.balance<hBTC>(amount), then withdraw::request_withdrawal. The status comes from view.withdrawalStatus(digest).',
		note: {
			explain: 'A withdrawal locks hBTC in a request with your Bitcoin address (bc1q or bc1p only). The committee approves it, puts it in a Bitcoin batch, where the hBTC is burned and Hashi\'s UTXOs are locked, collects the MPC signatures and the guardian\'s, and confirms once Bitcoin does. Until the batch you can cancel, but only after a 1 hour cooldown. The miner fee comes out of your amount. Its budget is the minimum minus dust, so at the minimum a withdrawal could arrive as 546 sats in the worst case. Show the worst case before the user signs.',
			show: `Follow ${RUN.withdrawal} in Ferry: five steps, then the Bitcoin txid and its confirmations.`,
			ask: 'Why is there a cancel cooldown at all?',
			answer: 'So the committee is not racing users. A request the committee is about to batch should not vanish under it; after an hour, an unbatched request can be taken back.',
			next: 'What the user sees while they wait.',
			refs: 'packages/hashi/sources/btc/withdraw.move ; src/components/WithdrawCard.tsx',
		},
	});
	d.table(s, [
		['Status', 'What happened', 'Cancel?'],
		['Requested', 'Your hBTC is locked in the request', 'After 1 hour'],
		['Approved', 'The committee signed off on the request', 'After 1 hour'],
		['Processing', 'In a Bitcoin batch; the hBTC is burned', 'No'],
		['Signed', 'MPC and guardian signatures recorded on Sui', 'No'],
		['Confirmed', 'The BTC landed at your Bitcoin address', 'No'],
	], { widths: [2.4, 6.75, 2.4], rowH: 0.5, size: 14 });
	d.bar(s, 'At the minimum: 30,000 sats out, as little as 546 in. The fee budget is a ceiling; the real fee is usually far lower.', 6.0);
}

// 10 Waiting is a state
{
	const s = d.slide({
		eyebrow: 'THE TRACKER',
		title: 'An hour of waiting is a state, not an error',
		subtitle: 'Every stage from view.depositStatus(digest) and Esplora. Anything ambiguous shows as pending.',
		note: {
			explain: 'The longest part is Bitcoin itself: 6 blocks is about an hour. The tracker keeps the user calm and stops them from doing something twice. Ferry follows any digest, not just yours, and reads your own deposits and withdrawals back from the chain\'s index, so a new device sees everything. The browser only remembers which digests you asked to follow. If a request expires (not confirmed within a day), nothing was minted and the BTC is still at the address: record it again.',
			show: 'In Ferry, click Follow on a deposit under "Latest on Hashi mainnet": watch the confirmations count, then the approval time, then the delay countdown.',
			ask: 'The committee approved, the delay is over, but no hBTC yet. Failed?',
			answer: 'No. Someone still has to call confirm_deposit, which is what mints; the committee\'s nodes do it. Show "minting next" and keep polling.',
			next: 'Part 4: hBTC in your own Move code.',
			refs: 'src/lib/track.ts ; packages/hashi/sources/btc/deposit_queue.move',
		},
	});
	d.steps(s, [
		{ title: 'Seen', body: 'In the mempool. Recordable now: the committee waits for blocks itself.' },
		{ title: 'Confirming', body: 'n of 6 from Esplora. About an hour on Bitcoin.' },
		{ title: 'Approved', body: 'The committee has signed. The SDK reports when.' },
		{ title: 'Delay', body: 'Count down to the mint time the SDK reports. A pause can hold it here.' },
		{ title: 'Minted', body: 'Status confirmed. hBTC is in the address balance.' },
	], { y: 3.0, h: 3.2, bodySize: 15 });
}

// 11 Part 4: a Move object with its own Bitcoin address
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'MOVE/JAR/SOURCES/JAR.MOVE',
		title: 'A contract with its own Bitcoin address',
		subtitle: 'An object\'s ID is a Sui address, so Hashi can derive a Bitcoin address for it and mint hBTC to it.',
		note: {
			explain: 'This is what only Hashi on Sui can do. Hashi mints with balance::send_funds(btc, derivation_path), and the derivation path can be an object\'s ID. So a shared Jar object gets its own Bitcoin address, and BTC sent there becomes hBTC inside the jar, not in anyone\'s wallet. The jar releases it with withdraw_funds_from_object, only to the cap holder and only after unlock_ms: a Bitcoin savings jar with a time lock enforced on Sui. It is generic over the coin, so we tested the same path on testnet with SUI: funded with send_funds, take before unlock aborted, take after unlock worked.',
			show: `Run move/jar/README.md on testnet: publish, new, send_funds, take. Then derive the jar's Bitcoin address with generateDepositAddress({ suiAddress: jarId }). Testnet transactions: fund ${RUN.jarFund}, take ${RUN.jarTake}.`,
			ask: 'What else could own a Bitcoin address this way?',
			answer: 'Anything with an ID: a DAO treasury, an escrow for a trade, a loan vault that takes BTC as collateral, a payroll pot. The rules for spending live in Move.',
			next: 'Proof.',
			refs: 'move/jar/README.md ; packages/hashi/sources/btc/deposit.move (confirm_deposit)',
		},
	});
	d.code(s, [
		'public struct Jar<phantom T> has key { id: UID, unlock_ms: u64, taken: u64 }',
		'',
		'// Hashi mints with balance::send_funds(btc, jar id): the hBTC lands in the jar itself',
		'public fun take<T>(self: &mut Jar<T>, cap: &JarCap<T>, amount: u64, clock: &Clock): Balance<T> {',
		'    assert!(cap.jar_id == self.id.to_inner(), EWrongCap);',
		'    assert!(clock.timestamp_ms() >= self.unlock_ms, ELocked);',
		'    balance::redeem_funds(balance::withdraw_funds_from_object<T>(&mut self.id, amount))',
		'}',
		'',
		'public fun held<T>(self: &Jar<T>, root: &AccumulatorRoot): u64 {',
		'    balance::settled_funds_value<T>(root, self.id.to_address())',
		'}',
		'// TS: client.hashi.generateDepositAddress({ suiAddress: jarId })  ->  bc1p890h9...45ne7h',
	].join('\n'), { size: 10.5, y: 2.78, h: 4.05, lang: 'MOVE' });
}

// 12 Proof
{
	const s = d.slide({
		eyebrow: 'VERIFIED',
		title: 'Proof: real transactions and checks',
		subtitle: 'Mainnet reads and simulations move no money. The jar ran on testnet with SUI.',
		note: {
			explain: `pnpm verify reads mainnet: Esplora is Hashi's chain, 7 of 7 held deposits paid the derived address, BTC held equals hBTC supply, a used UTXO aborts. pnpm e2e drives ${LIVE} with a test wallet carrying a real holder's address that never signs: it keeps the bytes the app hands it, and those bytes simulate on mainnet to DepositRequested and WithdrawalRequested. The deposit and withdrawal rows are other people's real mainnet transactions that Ferry follows.`,
			show: 'Open the 0.02 BTC deposit on Suiscan, then its Bitcoin transaction on mempool.space: the output pays the address Ferry shows for that Sui address.',
			ask: 'Why simulate instead of just sending a real transaction in the test?',
			answer: 'A real deposit needs real BTC and an hour. Simulation runs the same Move code against live mainnet state and costs nothing, so it can run on every change.',
			next: 'What will bite you.',
			refs: `${REPO}#verified-11-november-2026 ; move/jar/README.md`,
		},
	});
	const row = (what, where, id) => [what, where, id ? short(id) : 'pending'];
	d.table(s, [
		['What', 'Where', 'Transaction or check'],
		row('A 0.02 BTC deposit, recorded to minted', 'Sui mainnet', RUN.deposit),
		row('A 0.0003 BTC withdrawal, BTC confirmed', 'Sui mainnet', RUN.withdrawal),
		['BTC held equals hBTC supply', 'Sui + Bitcoin', '1,442,974,424 sats each'],
		['Held deposits paid the derived address', 'Bitcoin mainnet', '7 of 7'],
		['Ferry\'s record and withdraw bytes', 'Sui mainnet', 'simulate to Requested events'],
		row('Jar funded with send_funds', 'Sui testnet', RUN.jarFund),
		row('Jar taken after unlock', 'Sui testnet', RUN.jarTake),
		row('Our own deposit through Ferry', 'Sui mainnet', RUN.ours),
	], { widths: [4.6, 2.2, 4.75], rowH: 0.44, size: 13, monoCols: [2] });
}

// 13 Gotchas and take home
{
	const s = d.slide({
		eyebrow: 'GOTCHAS',
		title: 'Six things that will bite you',
		subtitle: 'All of them from building Ferry against mainnet.',
		note: {
			explain: 'Two of these cost users money: the minimum (BTC below it is stuck at an address they cannot spend) and the fee at the minimum. The rest cost you time.',
			show: 'README "Gotchas" in the repo has the full list with the reasons.',
			ask: 'Which one would you put in red on the deposit screen?',
			answer: 'The minimum. Show it next to the address and the QR code, before anyone sends.',
			next: 'Hands on: everyone opens Ferry, connects Slush, finds their own Bitcoin address, and follows a live deposit.',
			refs: `${REPO} README "Gotchas"`,
		},
	});
	d.grid(s, [
		{ title: 'Testnet-first SDK', body: 'Pin 0.6.29 and pass the mainnet package and object ids yourself.' },
		{ title: 'No scanning', body: 'Hashi waits for someone to record the payment on Sui. Find it for the user.' },
		{ title: 'Reversed txids', body: 'Pass the txid explorers show. Hashi stores the bytes reversed.' },
		{ title: 'The minimum', body: 'Under 30,000 sats a payment cannot be recorded or spent. Say so first.' },
		{ title: 'Requests expire', body: 'Not confirmed within a day: nothing minted, BTC still there. Record again.' },
		{ title: 'Fee is a ceiling', body: 'At the minimum the worst case leaves 546 sats. Show it before signing.' },
	], { y: 2.5, h: 1.6, bodySize: 13.5 });
	d.bar(s, 'Take home: Bitcoin stays on Bitcoin. Your app finds the payment, records it, and tells the truth for the hour it takes.', 6.25);
}

const header = `# Day 3 Speaker Notes: Build with Hashi

Keys, Dollars and Bitcoin, Day 3, SuiHub Lagos. Deck: teaching/Day3_Build_with_Hashi.pptx (13 slides, rebuilt with \`pnpm slides\`). Class app: ${LIVE}. Repo: ${REPO}. Hashi: ${HASHI}.

## Before class

- Install Slush in the presenting browser, on mainnet, with a little SUI for gas.
- Open ${LIVE} on Mainnet. The live card should read the same number for hBTC minted and BTC held, and "same chain as Hashi".
- For a live deposit: send at least 30,000 sats (0.001 BTC is comfortable) from your own Bitcoin wallet to your Ferry deposit address at least 80 minutes before the class, record it in Ferry, and follow it. It needs 6 blocks and a 10 minute delay. Set OUR_DEPOSIT to its digest and rerun \`pnpm slides\` to fill the last row of slide 12.
- Have a real deposit and withdrawal digest ready to paste: ${RUN.deposit} and ${RUN.withdrawal}.
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

`;

d.save(OUT, NOTES, header).then((r) => console.log(`wrote ${r.out} (${r.slides} slides) and ${r.notesOut}`));
