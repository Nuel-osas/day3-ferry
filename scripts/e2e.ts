// Ferry in a real browser, on mainnet, without moving any money.
//
// A test wallet is injected over Wallet Standard (the way Slush registers) with the address of a real
// mainnet hBTC holder. It never signs: when the app hands it a transaction it keeps the bytes and
// declines, the same as a user pressing Reject. This script then simulates those exact bytes against
// mainnet, so we know the app built a transaction that would have worked.
//
// Checked:
//   1. The live panel reads Hashi and shows BTC held = hBTC minted.
//   2. The deposit address on the page equals the SDK's derivation for the connected address.
//   3. The holder's real deposit shows as minted, in payments and in history.
//   4. Record: a Bitcoin payment the app has never seen (Esplora's answer stubbed with one extra
//      output) gets a Record button; the bytes the wallet receives simulate to DepositRequested.
//   5. Withdraw: 0.0003 BTC to the BIP-173 test address; the bytes simulate to WithdrawalRequested.
//   6. A real mainnet withdrawal digest can be followed.
//   7. Testnet: the switch works and shows the Signet address and the 1 BTC minimum.
//
// Usage: pnpm e2e  (APP_URL=https://day3-ferry.vercel.app pnpm e2e for the live site)
import { mkdirSync, writeFileSync } from 'node:fs';
import { hashi } from '@mysten/hashi';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import puppeteer, { type Page } from 'puppeteer-core';
import { NETWORKS } from '../src/lib/networks';
import { activeUtxos } from '../src/lib/protocol';

const APP = process.env.APP_URL ?? 'http://localhost:5294';
const SHOTS = new URL('./.shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const net = NETWORKS.mainnet;
const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: net.suiGrpc }).$extend(
	hashi({ hashiObjectId: net.hashiObjectId, packageId: net.packageId, bitcoinNetwork: 'mainnet', graphqlUrl: net.graphql }),
);

let failed = 0;
const results: Record<string, unknown> = { app: APP, at: new Date().toISOString() };
const check = (ok: boolean, label: string, detail = '') => {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
	if (!ok) failed++;
	results[label] = ok;
};

// A real holder: an address Hashi minted hBTC to that still holds at least the withdrawal minimum and some SUI.
const snap = await client.hashi.view.all();
let HOLDER = process.env.HOLDER ?? '';
if (!HOLDER) {
	for (const u of await activeUtxos(net)) {
		if (!u.derivationPath) continue;
		const [b, gas] = await Promise.all([client.hashi.view.balance(u.derivationPath), client.core.getBalance({ owner: u.derivationPath })]);
		if (b.totalBalance >= snap.bitcoinWithdrawalMinimum && BigInt(gas.balance.balance) > 50_000_000n) { HOLDER = u.derivationPath; break; }
	}
}
if (!HOLDER) throw new Error('No mainnet hBTC holder with SUI found to impersonate');
const expectAddr = await client.hashi.generateDepositAddress({ suiAddress: HOLDER });
console.log(`holder ${HOLDER}\ndeposit address ${expectAddr}`);

// The wallet in the page keeps what it is asked to sign and declines.
const asked: string[] = [];
const keep = async (json: string) => { asked.push(json); return { ok: false, e: { message: 'User rejected the request (test wallet never signs)' } }; };

function inject(address: string) {
	const icon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiLz4=';
	const w = window as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean; e?: { message: string } }>>;
	const account = { address, publicKey: new Uint8Array(32), chains: ['sui:mainnet', 'sui:testnet'], features: ['sui:signTransaction'] };
	const sign = async ({ transaction }: { transaction: { toJSON: () => Promise<string> } }) => {
		const r = await w.__keep(await transaction.toJSON());
		throw new Error(r.e!.message);
	};
	const wallet = {
		version: '1.0.0', name: 'Test Wallet', icon, chains: ['sui:mainnet', 'sui:testnet'], accounts: [account],
		features: {
			'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [account] }) },
			'standard:events': { version: '1.0.0', on: () => () => {} },
			'sui:signTransaction': { version: '2.0.0', signTransaction: sign },
		},
	};
	const register = (api: { register: (x: unknown) => void }) => api.register(wallet);
	window.addEventListener('wallet-standard:app-ready', ((e: CustomEvent) => register(e.detail)) as EventListener);
	window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));
}

// One extra, never-seen 30,000-sat payment to the holder's deposit address, added to Esplora's answer.
const FAKE_TXID = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
async function stubEsplora(page: Page) {
	await page.setRequestInterception(true);
	page.on('request', async (req) => {
		const u = req.url();
		if (u.includes(`/address/${expectAddr}/txs`) && u.startsWith(net.esplora[0])) {
			const real = await fetch(u).then((r) => r.json()).catch(() => []);
			const fake = { txid: FAKE_TXID, vout: [{ scriptpubkey_address: expectAddr, value: Number(snap.bitcoinDepositMinimum) }], status: { confirmed: false } };
			return req.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([fake, ...real]) });
		}
		req.continue();
	});
}

const simulate = async (json: string, sender: string) => {
	const tx = Transaction.from(json);
	tx.setSenderIfNotSet(sender);
	const r = await client.core.simulateTransaction({ transaction: await tx.build({ client }), include: { effects: true, events: true } });
	const t = r.Transaction ?? r.FailedTransaction!;
	return { ok: t.effects!.status.success, error: t.effects!.status.success ? null : (t.effects!.status as { error: { message: string } }).error.message, events: t.events ?? [] };
};

const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1400 });
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 300)));
await page.exposeFunction('__keep', keep);
await page.evaluateOnNewDocument('globalThis.__name = (f) => f;');
await page.evaluateOnNewDocument(inject, HOLDER);
await stubEsplora(page);

const text = (sel: string) => page.$eval(sel, (e) => (e as HTMLElement).innerText).catch(() => '');
const clickText = async (label: string, scope = 'button') => {
	const ok = await page.evaluate((label, scope) => {
		const b = [...document.querySelectorAll<HTMLButtonElement>(scope)].find((x) => (x.textContent ?? "").trim().startsWith(label) && !x.disabled);
		b?.click();
		return !!b;
	}, label, scope);
	if (!ok) throw new Error(`No enabled button "${label}"`);
};
const waitText = (sel: string, re: RegExp, timeout = 90_000) =>
	page.waitForFunction((sel, src) => [...document.querySelectorAll(sel)].some((e) => new RegExp(src).test((e as HTMLElement).innerText)), { timeout, polling: 500 }, sel, re.source);

await page.goto(`${APP}/?net=mainnet`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });

// 1. live panel
await page.waitForSelector('[data-testid=reserve]', { timeout: 120_000 }).catch(() => null);
check((await text('[data-testid=reserve]')).includes('1 : 1'), 'Live panel shows BTC held = hBTC minted');

// 2. connect, deposit address
await clickText('Connect Test Wallet');
await page.waitForSelector('[data-testid=connected]', { timeout: 30_000 });
await waitText('[data-testid=deposit-address]', /^bc1p/);
const shown = await text('[data-testid=deposit-address]');
check(shown === expectAddr, 'Deposit address on the page equals the SDK derivation', shown);

// 3. the holder's real deposit is minted
await waitText('#deposit .pay', /In Hashi, hBTC minted/).then(() => true, () => false).then((ok) => check(ok, "The holder's real deposit shows as minted"));
await waitText('#transfers [data-testid=xfer-deposit]', /hBTC minted/).then(() => true, () => false).then((ok) => check(ok, 'History follows the deposit to minted'));
await page.screenshot({ path: `${SHOTS}1-mainnet-connected.png`, fullPage: true });

// 4. record a payment the app has not seen
await waitText('#deposit .pay', /Not recorded/);
asked.length = 0;
await clickText('Record on Sui');
await waitText('#deposit .inline-err', /declined/i, 60_000);
check(asked.length === 1, 'Record: the wallet was asked to sign once');
if (asked[0]) {
	const s = await simulate(asked[0], HOLDER);
	const ev = s.events.find((e) => e.eventType.endsWith('::deposit::DepositRequested'));
	const j = ev?.json as { derivation_path?: string; amount?: string; utxo_id?: { txid: string } } | undefined;
	const internal = FAKE_TXID.match(/../g)!.reverse().join('');
	check(s.ok && j?.derivation_path === HOLDER && j?.amount === String(snap.bitcoinDepositMinimum) && j?.utxo_id?.txid === `0x${internal}`,
		'Record: the signed-for bytes simulate to DepositRequested for the holder', s.error ?? `txid stored reversed: ${j?.utxo_id?.txid.slice(0, 12)}...`);
}

// 5. withdraw
await page.type('#withdraw .amount input', '0.0003');
await page.type('#withdraw input.mono', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
await page.click('#withdraw .check input');
await waitText('#withdraw .quote', /You receive at least\s*0\.00000546/);
asked.length = 0;
await clickText('Request withdrawal');
await waitText('#withdraw .inline-err', /declined/i, 60_000);
check(asked.length === 1, 'Withdraw: the wallet was asked to sign once');
if (asked[0]) {
	const s = await simulate(asked[0], HOLDER);
	const ev = s.events.find((e) => e.eventType.endsWith('::withdrawal_queue::WithdrawalRequested'));
	check(s.ok && (ev?.json as { btc_amount?: string })?.btc_amount === '30000', 'Withdraw: the signed-for bytes simulate to WithdrawalRequested for 30,000 sats', s.error ?? '');
}

// 6. follow a real withdrawal
const w = await client.core.listEvents?.({ filter: { moveEventType: `${net.packageId}::withdrawal_queue::WithdrawalRequested` }, limit: 1 } as never).catch(() => null) as { events?: { transactionDigest?: string }[] } | null;
const wDigest = process.env.W_DIGEST ?? w?.events?.[0]?.transactionDigest ?? 'GUHmUvtZPvpEFTvavzM6HsCGab2Fid847UZAjLtTefa5';
await page.type('#transfers input.mono', wDigest);
await clickText('Follow');
await waitText('#transfers [data-testid=xfer-withdrawal]', /Withdrawal/).then(() => true, () => false).then((ok) => check(ok, 'A real mainnet withdrawal can be followed', wDigest));
await page.screenshot({ path: `${SHOTS}2-mainnet-actions.png`, fullPage: true });

// 7. testnet
await clickText('Testnet');
await waitText('[data-testid=deposit-address]', /^tb1p/);
await waitText('#protocol .stats', /1 \/ 1/).then(() => true, () => false).then((ok) => check(ok, 'Testnet shows the Signet address and the 1 BTC minimum'));
await page.screenshot({ path: `${SHOTS}3-testnet.png`, fullPage: true });

// phone
await page.setViewport({ width: 390, height: 844, isMobile: true });
await clickText('Mainnet');
await page.waitForSelector('[data-testid=reserve]', { timeout: 60_000 }).catch(() => null);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check(!overflow, 'No sideways scroll at phone width');
await page.screenshot({ path: `${SHOTS}4-phone.png`, fullPage: true });

await browser.close();
results.holder = HOLDER;
writeFileSync(new URL('./.e2e.json', import.meta.url), JSON.stringify(results, null, 2));
console.log(failed ? `\n${failed} check(s) failed` : '\nPASS: every check');
process.exit(failed ? 1 : 0);
