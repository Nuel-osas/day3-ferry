// Day 3 deck: Hashi on Sui (13 slides) and speaker notes. Run: pnpm slides
// The class rhythm: what Hashi is, why it exists and the problem it solves, its impact on Sui, what
// changed since mainnet, what it means for developers, how to position yourself, a demo dApp, and
// a demo the room can try. Facts: Sui's blog (March and July 2026), launch coverage (8 Oct 2026),
// and Sui mainnet read on 11 and 12 Nov 2026 (scripts/verify-mainnet.ts and Hashi's events).
const path = require('node:path');
const { createDeck, assets } = require('./deck-kit.cjs');

const LIVE = 'https://day3-ferry.vercel.app';
const REPO = 'https://github.com/Nuel-osas/day3-ferry';
const HASHI = 'https://github.com/MystenLabs/hashi';
const BLOG_MEET = 'https://www.sui.io/blog/new-era-of-bitcoin-based-finance-begins-meet-hashi';
const BLOG_COALITION = 'https://www.sui.io/blog/hashi-global-coalition-expands';
const COVERAGE = 'https://cryptobriefing.com/hashi-mainnet-to-launch-with-500m-in-capital-backing-adds-anchorage-digital-to-coalition/';
const OUT = process.env.SLIDES_OUT || path.join(__dirname, 'Day3_Build_with_Hashi.pptx');
const NOTES = path.join(__dirname, 'day3-speaker-notes.md');

const RUN = {
	deposit: '57SeRZ7xKmmRB6Tm1AgNV3Ngkb6b1VRnvzvfHbvYZP25', // a 0.02 BTC deposit, recorded to minted, 11 Nov
	withdrawal: 'GUHmUvtZPvpEFTvavzM6HsCGab2Fid847UZAjLtTefa5', // a 0.0003 BTC withdrawal, confirmed on Bitcoin, 11 Nov
	jarTake: '3StPb2xWLz4FiStur6z5dq3fvnUwwAsFgB1R8GQe2hM8', // jar taken after unlock, testnet
};

const d = createDeck({
	title: 'Hashi on Sui: What Bitcoin on Mainnet Means for Builders',
	subject: 'Keys, Dollars and Bitcoin, Day 3, SuiHub Lagos, November 2026',
	footerLeft: 'KEYS, DOLLARS AND BITCOIN · SUIHUB LAGOS',
	footerRight: 'DAY 3 · HASHI ON SUI',
	total: 13,
	glow: path.join(assets, 'cover-glow.png'),
});

// 01 Cover
d.cover({
	glyph: '≈',
	name: 'hashi',
	subtitle: 'Bitcoin on Sui, now on mainnet',
	blurb: 'What Hashi is, the problem it solves, what changed on Sui since mainnet, what it means for you as a developer, and a demo dApp you can try today.',
	link: LIVE,
	label: '[ KEYS, DOLLARS AND BITCOIN · DAY 3 · SUIHUB LAGOS ]',
	note: {
		explain: 'Day 1 was keys, Day 2 was dollars, today is Bitcoin. Hashi went live on Sui mainnet in October. Today is about understanding it and seeing where you fit as a builder, then trying a working dApp on it.',
		show: `Open ${LIVE} on the projector, on Mainnet. Point at the live card: hBTC minted and BTC held, the same number.`,
		ask: 'Who here holds BTC? Where is it, and what does it do all day?',
		answer: 'Mostly on an exchange or in a wallet, doing nothing. Using it anywhere else has meant selling it or handing it to a custodian.',
		next: 'What Hashi is, in one sentence.',
		refs: `${LIVE} ; ${HASHI}`,
	},
});

// 02 What Hashi is
d.statement({
	eyebrow: 'WHAT HASHI IS',
	line1: 'Lock on Bitcoin, mint on Sui, burn to release.',
	line2: 'Your BTC stays on Bitcoin.\nhBTC moves on Sui.',
	body: 'Hashi is Sui\'s native Bitcoin bridge. You send BTC to a Bitcoin address that Sui\'s validator committee and an independent guardian control together. After 6 confirmations the committee approves it on Sui, and after a 10 minute safety delay hBTC is minted to you, one for one. Burn hBTC and the committee sends the BTC back to Bitcoin.',
	note: {
		explain: 'Compare with Day 2. CCTP could burn and mint USDC because Circle issues it. Nobody issues Bitcoin, so it cannot be burned: it has to be locked. The question is who holds the lock. In Hashi it is a threshold of Sui validators signing together (MPC) plus a guardian key, and every rule for when they sign lives in Move on Sui.',
		show: 'Draw it: Bitcoin on the left with a padlock address, Sui on the right with hBTC. Arrow right: deposit, 6 blocks, approve, delay, mint. Arrow left: burn, batch, sign, BTC.',
		ask: 'If nobody can burn BTC, what stops the committee from walking away with it?',
		answer: 'The address needs two signatures: the committee\'s threshold key and the guardian\'s. The guardian also rate-limits withdrawals, and the delays leave time to pause.',
		next: 'The parts.',
		refs: `${HASHI} (design/docs/user-flows.mdx)`,
	},
});

// 03 What it is made of
{
	const s = d.slide({
		eyebrow: 'WHAT HASHI IS',
		title: 'The six parts',
		subtitle: 'From Hashi\'s docs and Move source, with live numbers from Sui mainnet on 11 November.',
		note: {
			explain: 'The committee is Sui\'s own validators running threshold MPC: 105 members on mainnet. The guardian is an independent signer in every deposit address and the rate limit on the way out. Every Sui address gets its own Bitcoin address. hBTC is a normal Sui coin. The delays are the safety net. There is no HASHI token: the committee governs by stake.',
			show: 'Ferry\'s live card: committee 105, guardian can sign 50 BTC now, refills about 50 BTC a day, 6 confirmations then 10 minutes.',
			ask: 'Why a 10 minute delay after the committee already approved?',
			answer: 'If a committee signature is ever wrong, operators have a window to pause before anything is minted.',
			next: 'Why build this at all?',
			refs: `${HASHI}/tree/main/design/docs ; packages/hashi/sources/btc/deposit.move`,
		},
	});
	d.grid(s, [
		{ title: 'Committee', body: '105 Sui validators sign Bitcoin transactions together with threshold MPC. No single key holds the BTC.' },
		{ title: 'Guardian', body: 'A second, independent key in every deposit address, and a rate limit out: 50 BTC, refilled about 50 a day.' },
		{ title: 'Your address', body: 'Every Sui address has its own Bitcoin deposit address, derived from both keys and the Sui address.' },
		{ title: 'hBTC', body: 'A Sui coin with 8 decimals, minted into your address balance. One hBTC for every BTC held.' },
		{ title: 'Delays', body: '6 Bitcoin confirmations, then a 10 minute window to pause a bad approval before anything mints.' },
		{ title: 'Governance', body: 'No HASHI token. Committee members vote with stake on pauses, minimums and upgrades.' },
	], { y: 2.6, h: 1.95 });
}

// 04 Why Hashi: the problem
{
	const s = d.slide({
		eyebrow: 'WHY HASHI',
		title: 'The problem it solves',
		subtitle: 'Sui, March 2026: Bitcoin is a $1.4T+ asset, and only 0.22% of it (about $3.07B) is used in DeFi.',
		note: {
			explain: 'Most Bitcoin does nothing. To use it you either sell it, or hand it to someone who issues a wrapped token, and you trust their reserves. Sui\'s own framing: synthetic Bitcoin products "lacked transparency on collateral management", so institutions stayed away. Hashi\'s answer is that the BTC never leaves Bitcoin, the keys are spread across Sui\'s validators plus a guardian, and the reserve can be checked by anyone: we checked it, and it matches to the satoshi.',
			show: 'In Ferry\'s live card: hBTC minted equals BTC held. Anyone can run that check from Sui GraphQL; scripts/verify-mainnet.ts does.',
			ask: 'Why would someone borrow dollars against their BTC instead of selling it?',
			answer: 'They keep their Bitcoin and its upside, they do not trigger a sale, and they get spending money now. In a weak currency that is exactly what a BTC holder wants.',
			next: 'What Hashi does for Sui.',
			refs: `${BLOG_MEET} ; scripts/verify-mainnet.ts`,
		},
	});
	d.compare(s,
		{ title: 'Before: sell it or wrap it', bullets: ['Sell BTC to get dollars, and lose the upside', 'Or hand it to a custodian for a wrapped token', 'Reserves you cannot check yourself', 'One company can freeze, lose or misuse it'] },
		{ title: 'Hashi: lock it, use it', bullets: ['BTC stays on Bitcoin, under a validator committee and a guardian', 'Borrow against it without selling', 'Reserve on chain: 14.43 BTC held = 14.43 hBTC', 'Rules in Move, with delays and a pause'] },
		{ y: 2.6, h: 4.15 });
}

// 05 Impact on Sui
{
	const s = d.slide({
		eyebrow: 'IMPACT ON SUI',
		title: 'What Hashi brings to Sui',
		subtitle: 'From Sui\'s launch posts (March and July 2026) and launch coverage on 8 October 2026.',
		note: {
			explain: 'For Sui this is the biggest asset in crypto arriving as a native coin, secured by Sui\'s own validators. The launch coalition is the signal: more than $500 million in capital commitments and more than 20 launch partners, with Anchorage Digital added at Basecamp. Lending protocols named for day one: AlphaLend, Bluefin, Current, Scallop and Suilend, with NAVI slated for Hashi lending and Fluid joining. Institutions get custody routes (BitGo, Anchorage, Ledger), liquidity (FalconX, Cumberland, Bullish, Erebor), pricing (CF Benchmarks), insurance (Soter) and audits (Certora, OtterSec, Asymptotic). These are announcements; check each protocol for what is live before you build on it.',
			show: `Open ${BLOG_COALITION} and scroll the partner list.`,
			ask: 'Which of these matters most for a small team in Lagos?',
			answer: 'The lending markets. If hBTC is collateral on Suilend, Scallop or NAVI, your app can offer BTC-backed loans without running a lending protocol yourself.',
			next: 'What actually changed since mainnet.',
			refs: `${BLOG_MEET} ; ${BLOG_COALITION} ; ${COVERAGE}`,
		},
	});
	d.grid(s, [
		{ title: 'BTC, native to Sui', body: 'hBTC is a Sui coin any Move contract can hold, secured by Sui\'s own validators.' },
		{ title: 'Institutions', body: '$500M+ committed, 20+ launch partners, Anchorage Digital among them.' },
		{ title: 'Lending', body: 'AlphaLend, Bluefin, Current, Scallop and Suilend named for day one; NAVI and Fluid too.' },
		{ title: 'Dollar loans', body: 'Borrow stablecoins such as USDC against BTC, without selling it.' },
		{ title: 'Vaults and yield', body: 'Concrete and Bluefin vaults, BTC-backed bonds, RWA strategies.' },
		{ title: 'Trust layer', body: 'CF Benchmarks pricing, Soter insurance, audits by Certora, OtterSec and Asymptotic.' },
	], { y: 2.6, h: 1.95 });
}

// 06 Since mainnet
{
	const s = d.slide({
		eyebrow: 'READ FROM SUI MAINNET',
		title: 'What changed since mainnet',
		subtitle: 'Hashi\'s own events on Sui, read on 12 November. Every row can be checked by anyone.',
		note: {
			explain: 'At Basecamp on 8 October Sui said mainnet would open that month, in phases. The chain shows it: the first BTC deposit was recorded and minted on 22 October. Two weeks later, on 2 November, 9.5 BTC came in on one day, including a single 6 BTC deposit. By 12 November, 46 deposits had minted 14.44 BTC of hBTC to 24 different Sui addresses, and 27 withdrawals had gone back to Bitcoin. It is real and growing, and it is early: 24 holders means the app layer is almost empty.',
			show: `In Ferry, "Latest on Hashi mainnet": the newest deposits and withdrawals, minutes or hours old. Follow one.`,
			ask: '24 holders after three weeks. Is that good or bad news for you?',
			answer: 'Good. The infrastructure is live and the apps are not built yet. That is the window.',
			next: 'What this means for you as a developer.',
			refs: `${COVERAGE} ; Hashi events DepositConfirmed and WithdrawalRequested on Sui GraphQL`,
		},
	});
	d.table(s, [
		['When', 'What happened', 'Source'],
		['8 Oct 2026', 'Mainnet announced for October: $500M+, 20+ partners, Anchorage', 'Sui Basecamp coverage'],
		['22 Oct 2026', 'First BTC deposit recorded and first hBTC minted', 'Sui mainnet'],
		['2 Nov 2026', '9.5 BTC in one day, including a single 6 BTC deposit', 'Sui mainnet'],
		['11 Nov 2026', 'BTC held = hBTC minted: 14.42974424 each', 'Sui mainnet + Bitcoin'],
		['12 Nov 2026', '46 deposits, 14.44 BTC minted, 24 holders, 27 withdrawals', 'Sui mainnet'],
		['Today', 'Minimum 30,000 sats; 105 validators in the committee', 'Hashi on Sui'],
	], { widths: [1.9, 6.85, 2.8], rowH: 0.52, size: 13.5 });
}

// 07 What mainnet means for developers
{
	const s = d.slide({
		eyebrow: 'FOR DEVELOPERS',
		title: 'What Hashi mainnet means for you',
		subtitle: 'The infrastructure is live. The products on top of it are still to be built.',
		note: {
			explain: 'Five things changed for a developer. One: real users with real BTC, on mainnet, from 30,000 sats. Two: an SDK, @mysten/hashi, with readers for everything and transaction builders your users sign in their own wallet (pre-1.0, pin it, and pass the mainnet ids yourself). Three: hBTC is just a Sui coin, so everything you know about Move applies. Four, the one only Sui has: any object can have its own Bitcoin address, so a contract can receive BTC directly. Five: the partners named the products they want: BTC-backed loans, vaults, structured products. Most of the consumer and local products are not on that list.',
			show: 'Open src/lib/hashi.ts and src/lib/actions.ts in the repo: the whole integration is two small files.',
			ask: 'Which of these five could you start on tonight?',
			answer: 'All of them read-only, on mainnet, with no BTC: addresses, protocol state, live deposits. And the Move part on testnet.',
			next: 'How to position yourself.',
			refs: `https://www.npmjs.com/package/@mysten/hashi ; ${HASHI}/blob/main/design/docs/reference/networks.mdx`,
		},
	});
	d.grid(s, [
		{ title: 'Real BTC, real users', body: 'Mainnet is open from 30,000 sats. Testnet pairs with Bitcoin Signet for reads.' },
		{ title: 'An SDK', body: '@mysten/hashi: read anything, build PTBs your users sign in their own wallet.' },
		{ title: 'Just a Sui coin', body: 'hBTC is Balance<BTC>. Everything you know about Move and PTBs applies.' },
		{ title: 'Contracts own BTC', body: 'Any object ID can get a Bitcoin address. BTC paid to it lands in the contract.' },
		{ title: 'A shopping list', body: 'Partners want BTC-backed loans, vaults and structured products built on Sui.' },
		{ title: 'An empty app layer', body: '24 holders so far. Wallet flows, payments and local products are open.' },
	], { y: 2.6, h: 1.95 });
}

// 08 Position yourself
{
	const s = d.slide({
		eyebrow: 'POSITION YOURSELF',
		title: 'How to be early on Hashi',
		subtitle: 'Five moves for a Sui developer in Lagos who wants to build Bitcoin products.',
		note: {
			explain: 'Learn it properly first: run Ferry, read the SDK and Hashi\'s deposit.move and withdraw.move. Build on what is free: mainnet reads and testnet Move cost nothing. Then pick a product the launch partners are not building, for users you understand. In Nigeria people already hold BTC as savings and trade it person to person: escrow for P2P trades, Bitcoin payment links for freelancers and merchants, BTC savings with a lock, and dollar loans against BTC through the lending markets. Plug into the partners rather than competing with them. And ship in public: a dashboard, a tracker, a tool other builders need.',
			show: 'Write the room\'s product ideas on the board under the five moves.',
			ask: 'What Bitcoin problem do you or people you know have this month?',
			answer: 'Common answers: selling BTC to pay bills, P2P scams, getting paid by foreign clients, saving against the naira. Each is a product.',
			next: 'What a Hashi dApp looks like.',
			refs: `${REPO} ; ${HASHI}`,
		},
	});
	d.steps(s, [
		{ title: 'Learn it', body: 'Run Ferry. Read the SDK and Hashi\'s deposit and withdraw Move code.' },
		{ title: 'Build free', body: 'Mainnet reads need no BTC. Your Move code runs on testnet.' },
		{ title: 'Go local', body: 'P2P escrow, payment links, BTC savings, dollar loans against BTC.' },
		{ title: 'Plug in', body: 'Build on the lending markets and wallets in the launch coalition.' },
		{ title: 'Ship it', body: 'Tools, dashboards and demos other builders need. Be the name people know.' },
	], { y: 3.0, h: 3.3, bodySize: 14.5 });
}

// 09 A demo dApp
{
	const s = d.slide({
		eyebrow: 'A DEMO DAPP',
		title: 'Ferry: what a Hashi dApp looks like',
		subtitle: `${LIVE.replace('https://', '')} · built on @mysten/hashi, no server, the user's own Slush wallet.`,
		note: {
			explain: 'Ferry is the shape every Hashi app shares. Your Bitcoin address with a QR code. The Bitcoin payments to it, found by the app, because Hashi does not scan Bitcoin for you. Recording a payment on Sui, signed in the user\'s wallet. A tracker for the hour it takes. The way back, with the worst-case fee shown first. And the reserve check. What it must handle for users: the 30,000 sat minimum (below it, BTC is stuck), byte-reversed txids, requests that expire after a day, and the worst-case fee.',
			show: `On ${LIVE}: connect Slush, show the deposit address and QR, then follow ${RUN.deposit} under Track to minted.`,
			ask: 'Which screen would you change for a Nigerian user?',
			answer: 'Probably the amounts: show naira next to sats, and the minimum in naira before anyone sends.',
			next: 'The code behind it.',
			refs: `${LIVE} ; ${REPO}`,
		},
	});
	d.steps(s, [
		{ title: 'Your address', body: 'One Bitcoin address per Sui address, with a QR code and the minimum.' },
		{ title: 'Payments', body: 'Hashi does not scan Bitcoin. The app finds the outputs that paid you.' },
		{ title: 'Record', body: 'One PTB, simulated first, then signed in the user\'s wallet.' },
		{ title: 'Track', body: 'Confirmations, approval, the delay, the mint. Pending, never failed.' },
		{ title: 'Withdraw', body: 'Withdraw with the worst-case fee shown first, cancel within the rules.' },
	], { y: 3.0, h: 3.3, bodySize: 14.5 });
}

// 10 The code
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: '@MYSTEN/HASHI 0.6.29',
		title: 'The whole integration in one screen',
		subtitle: 'The SDK extends any Sui client. view reads, tx builds unsigned PTBs, call gives Move calls.',
		note: {
			explain: 'Everything is under client.hashi after $extend(hashi()). On mainnet pass the package and object ids, from Hashi\'s docs. Use the tx builders, not the signing helpers, so the user\'s wallet signs and no key sits in your page. Pass txids the way explorers show them; the SDK reverses the bytes for Hashi.',
			show: 'Open src/lib/hashi.ts, src/lib/actions.ts and src/lib/sign.ts in the repo.',
			ask: 'Where does the Bitcoin data come from, if the SDK only talks to Sui?',
			answer: 'From any Bitcoin API. Ferry reads Esplora (blockstream.info, mempool.space) from the browser and checks first that it is the same chain Hashi watches.',
			next: 'One level down: your own Move code.',
			refs: 'src/lib/hashi.ts ; src/lib/actions.ts ; src/lib/sign.ts',
		},
	});
	d.code(s, [
		"const client = new SuiGrpcClient({ network: 'mainnet', baseUrl }).$extend(",
		"  hashi({ hashiObjectId, packageId, bitcoinNetwork: 'mainnet' }),  // mainnet: pass the ids",
		');',
		'',
		'client.hashi.generateDepositAddress({ suiAddress })    // your Bitcoin address',
		'client.hashi.view.all()                                // minimums, confirmations, delays, paused',
		'client.hashi.view.depositStatus(digest)                // pending, confirmed, expired',
		'client.hashi.view.transactionHistory(address)          // deposits and withdrawals',
		'client.hashi.view.balance(address)                     // hBTC, in sats',
		'client.hashi.tx.deposit({ txid, utxos, recipient })    // unsigned PTB: the wallet signs',
		'client.hashi.tx.requestWithdrawal({ amount, bitcoinAddress })',
		'client.hashi.guardian.canWithdraw(sats)                // the rate limiter',
	].join('\n'), { size: 11.5, y: 2.78, h: 4.05 });
}

// 11 Your own Move code
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'MOVE/JAR/SOURCES/JAR.MOVE',
		title: 'A contract with its own Bitcoin address',
		subtitle: 'An object\'s ID is a Sui address, so Hashi can give it a Bitcoin address and mint hBTC straight into it.',
		note: {
			explain: 'This is what only Hashi on Sui can do, and where local products come from. Hashi mints with balance::send_funds(btc, derivation_path), and the derivation path can be an object\'s ID. So a shared Jar object gets its own Bitcoin address, and BTC sent there becomes hBTC inside the jar. The jar releases it with withdraw_funds_from_object, only to its cap holder and only after unlock_ms. Swap the time lock for "seller confirms the naira arrived" and it is a P2P escrow; for "invoice paid" and it is a payment link.',
			show: `Run move/jar on testnet (move/jar/README.md): publish, new, send_funds, take. Testnet take: ${RUN.jarTake}.`,
			ask: 'What else could own a Bitcoin address this way?',
			answer: 'An escrow for a P2P trade, an invoice, a savings pot, a DAO treasury, a loan vault. The rules for spending live in Move.',
			next: 'Try it yourself.',
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
		'// TS: client.hashi.generateDepositAddress({ suiAddress: jarId })  ->  bc1p890h9...45ne7h',
	].join('\n'), { size: 11, y: 2.78, h: 4.05, lang: 'MOVE' });
}

// 12 Try it
{
	const s = d.slide({
		eyebrow: 'HANDS ON',
		title: 'Try it now',
		subtitle: 'No BTC needed. Mainnet for reading and following, testnet for your own Move code.',
		note: {
			explain: 'Everyone can do the first three on their phone. The last two need a laptop. Nobody needs BTC: we read mainnet and follow other people\'s real deposits, and the jar runs on testnet with SUI standing in for hBTC.',
			show: `Walk the room through each step on the projector, then give them 20 minutes. Real digests to follow: deposit ${RUN.deposit}, withdrawal ${RUN.withdrawal}.`,
			ask: 'Whose Bitcoin address starts with bc1p? Why does everyone\'s?',
			answer: 'Everyone\'s does: Hashi deposit addresses are Taproot (P2TR), and Taproot addresses on Bitcoin mainnet start with bc1p.',
			next: 'Take home.',
			refs: `${LIVE} ; ${REPO} ; move/jar/README.md`,
		},
	});
	d.steps(s, [
		{ title: 'Your address', body: 'Open day3-ferry.vercel.app, connect Slush: your own Bitcoin address.' },
		{ title: 'Follow one', body: 'Pick one under "Latest on Hashi mainnet" and follow it to the mint.' },
		{ title: 'Reserve', body: 'BTC held against hBTC minted, live. Then switch to Testnet.' },
		{ title: 'Verify', body: 'Clone the repo: pnpm install, then pnpm verify against mainnet.' },
		{ title: 'Your jar', body: 'Publish move/jar on testnet and get its own Bitcoin address.' },
	], { y: 3.0, h: 3.3, bodySize: 14.5 });
}

// 13 Take home
d.statement({
	eyebrow: 'TAKE HOME',
	line1: 'The rails are live. The apps are not built yet.',
	line2: 'Bitcoin is what people here already hold.\nNow it works on Sui.',
	body: `Hashi gives every Sui address, and every Move object, its own Bitcoin address. Three weeks after mainnet it held 14.44 BTC for 24 holders. Learn the SDK, build on testnet for free, and pick a Bitcoin product for users you understand. Code: ${REPO.replace('https://', '')}.`,
	note: {
		explain: 'Close on the opportunity: the infrastructure, the partners and the SDK exist; the products for ordinary users, especially local ones, do not.',
		show: 'Leave the repo link and the live app on screen while people ask questions.',
		ask: 'What will you build first?',
		answer: 'Collect three ideas from the room and say which part of today each one uses.',
		next: 'Questions.',
		refs: `${REPO} ; ${LIVE}`,
	},
});

const header = `# Day 3 Speaker Notes: Hashi on Sui

Keys, Dollars and Bitcoin, Day 3, SuiHub Lagos. Deck: teaching/Day3_Build_with_Hashi.pptx (13 slides, rebuilt with \`pnpm slides\`). Demo dApp: ${LIVE}. Repo: ${REPO}. Hashi: ${HASHI}.

## Before class

- Install Slush in the presenting browser, on mainnet.
- Open ${LIVE} on Mainnet. The live card should show the same number for hBTC minted and BTC held, and "same chain as Hashi".
- Have two real digests ready to paste under Track: deposit ${RUN.deposit} and withdrawal ${RUN.withdrawal}.
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

- Sui, "A New Era of Bitcoin-Based Finance Begins: Meet Hashi on Sui" (March 2026): ${BLOG_MEET}
- Sui, "Hashi global coalition expands" (July 2026): ${BLOG_COALITION}
- Crypto Briefing, mainnet with $500M in capital backing, Anchorage Digital added (8 Oct 2026): ${COVERAGE}
- Sui mainnet: Hashi's DepositConfirmed and WithdrawalRequested events, the UTXO pool and the hBTC supply, read on 11 and 12 Nov 2026.

`;

d.save(OUT, NOTES, header).then((r) => console.log(`wrote ${r.out} (${r.slides} slides) and ${r.notesOut}`));
