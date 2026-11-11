// Reading Bitcoin from the browser. Hashi does not scan Bitcoin for you: the app finds the funding
// transaction, picks the outputs that paid the deposit address, and counts confirmations.
// Esplora (blockstream.info, mempool.space) serves this over plain HTTPS with CORS.
import type { Network } from './networks';

export async function esplora<T = unknown>(n: Network, path: string, as: 'json' | 'text' = 'json'): Promise<T> {
	let last: unknown;
	for (const base of n.esplora) {
		try {
			const r = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(12_000) });
			if (r.status === 404 || r.status === 400) throw new NotFound(path);
			if (!r.ok) throw new Error(`${base} answered ${r.status}`);
			return (as === 'json' ? await r.json() : (await r.text()).trim()) as T;
		} catch (e) {
			if (e instanceof NotFound) throw e;
			last = e;
		}
	}
	throw new Error(`No Bitcoin data source answered (${String(last)})`);
}

export class NotFound extends Error {}

/** Bitcoin shows txids in reverse byte order from how they are hashed and stored. */
export const reverseHex = (h: string) => (h.replace(/^0x/, '').match(/../g) ?? []).reverse().join('');

export const isTxid = (s: string) => /^(0x)?[0-9a-fA-F]{64}$/.test(s.trim());

type EsploraTx = {
	txid: string;
	vout: { scriptpubkey_address?: string; value: number }[];
	status: { confirmed: boolean; block_height?: number; block_time?: number };
};

/** One output that paid an address. */
export type Payment = {
	txid: string; // display order, no 0x
	vout: number;
	amountSats: bigint;
	confirmed: boolean;
	blockHeight: number | null;
	blockTime: number | null;
};

const payments = (tx: EsploraTx, address: string): Payment[] =>
	tx.vout.flatMap((o, vout) =>
		o.scriptpubkey_address === address
			? [{ txid: tx.txid, vout, amountSats: BigInt(o.value), confirmed: tx.status.confirmed, blockHeight: tx.status.block_height ?? null, blockTime: tx.status.block_time ?? null }]
			: [],
	);

/** Every output that ever paid `address`, newest first (the last 50 transactions, mempool included). */
export async function paymentsTo(n: Network, address: string): Promise<Payment[]> {
	const txs = await esplora<EsploraTx[]>(n, `/address/${address}/txs`);
	return txs.flatMap((t) => payments(t, address));
}

/** The outputs of one transaction that paid `address`. Null if the transaction is unknown. */
export async function paymentsInTx(n: Network, txid: string, address: string): Promise<Payment[] | null> {
	try {
		return payments(await esplora<EsploraTx>(n, `/tx/${txid.replace(/^0x/, '').toLowerCase()}`), address);
	} catch (e) {
		if (e instanceof NotFound) return null;
		throw e;
	}
}

export async function tipHeight(n: Network): Promise<number> {
	return Number(await esplora<string>(n, '/blocks/tip/height', 'text'));
}

export type TxConfirmations = { seen: boolean; confirmations: number };

/** Confirmations of a transaction. `seen: false` if no data source knows it yet. */
export async function confirmations(n: Network, txid: string, tip?: number): Promise<TxConfirmations> {
	try {
		const s = await esplora<EsploraTx['status']>(n, `/tx/${txid.replace(/^0x/, '').toLowerCase()}/status`);
		if (!s.confirmed || !s.block_height) return { seen: true, confirmations: 0 };
		const h = tip ?? (await tipHeight(n));
		return { seen: true, confirmations: Math.max(0, h - s.block_height + 1) };
	} catch (e) {
		if (e instanceof NotFound) return { seen: false, confirmations: 0 };
		throw e;
	}
}
