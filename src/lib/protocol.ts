// Live protocol state the SDK does not summarise: who signs, how much BTC Hashi holds, how much hBTC
// exists, what is in flight, and the latest deposits and withdrawals. Read from Sui GraphQL.
// A failed read is null, never zero.
import { reverseHex } from './bitcoin';
import type { Network } from './networks';

async function gql<T>(n: Network, query: string, variables: Record<string, unknown> = {}): Promise<T> {
	const r = await fetch(n.graphql, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query, variables }),
		signal: AbortSignal.timeout(15_000),
	});
	const j = (await r.json()) as { data?: T; errors?: { message: string }[] };
	if (j.errors?.length) throw new Error(j.errors[0].message);
	if (!j.data) throw new Error('GraphQL returned no data');
	return j.data;
}

type Sized = { id: string; size: string };
type BitcoinState = {
	deposit_queue: { requests: Sized; processed: Sized };
	withdrawal_queue: { requests: Sized; processed: Sized; withdrawal_txns: Sized };
	utxo_pool: { utxo_records: Sized; spent_utxos: Sized };
};

/** `BitcoinStateKey` is an empty struct, so its BCS is the single byte 0 (base64 "AA=="). */
async function bitcoinState(n: Network): Promise<BitcoinState> {
	const d = await gql<{ object: { dynamicField: { value: { json: BitcoinState } } | null } | null }>(
		n,
		`query($id: SuiAddress!, $t: String!) { object(address: $id) { dynamicField(name: { type: $t, bcs: "AA==" }) { value { ... on MoveValue { json } } } } }`,
		{ id: n.hashiObjectId, t: `${n.packageId}::bitcoin_state::BitcoinStateKey` },
	);
	const s = d.object?.dynamicField?.value.json;
	if (!s) throw new Error('Hashi bitcoin state not found');
	return s;
}

export type ActiveUtxo = { btcTxid: string; vout: number; amountSats: bigint; derivationPath: string | null };

/** Every UTXO Hashi holds right now: the BTC that backs hBTC. `btcTxid` is in display order. */
export async function activeUtxos(n: Network): Promise<ActiveUtxo[]> {
	const table = (await bitcoinState(n)).utxo_pool.utxo_records.id;
	const out: ActiveUtxo[] = [];
	let after: string | null = null;
	type Page = { address: { dynamicFields: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: { value: { json: { utxo: { id: { txid: string; vout: number }; amount: string; derivation_path: string | null } } } }[] } } };
	for (let i = 0; i < 40; i++) {
		const d: Page = await gql<Page>(
			n,
			`query($id: SuiAddress!, $after: String) { address(address: $id) { dynamicFields(first: 50, after: $after) { pageInfo { hasNextPage endCursor } nodes { value { ... on MoveValue { json } } } } } }`,
			{ id: table, after },
		);
		for (const { value } of d.address.dynamicFields.nodes) {
			const u = value.json.utxo;
			// Hashi stores txids in internal byte order; explorers show the reverse.
			out.push({ btcTxid: reverseHex(u.id.txid), vout: Number(u.id.vout), amountSats: BigInt(u.amount), derivationPath: u.derivation_path });
		}
		if (!d.address.dynamicFields.pageInfo.hasNextPage) return out;
		after = d.address.dynamicFields.pageInfo.endCursor;
	}
	throw new Error('UTXO pool larger than Ferry pages through');
}

export async function hbtcSupply(n: Network): Promise<bigint | null> {
	const d = await gql<{ coinMetadata: { supply: string | null } | null }>(n, `query($t: String!) { coinMetadata(coinType: $t) { supply } }`, { t: `${n.packageId}::btc::BTC` });
	return d.coinMetadata?.supply != null ? BigInt(d.coinMetadata.supply) : null;
}

export type Protocol = {
	committeeMembers: number | null;
	committeeEpoch: number | null;
	supplySats: bigint | null;
	heldSats: bigint | null;
	utxoCount: number | null;
	depositsInFlight: number | null;
	depositsDone: number | null;
	withdrawalsInFlight: number | null;
	withdrawalsDone: number | null;
};

const settle = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

export async function readProtocol(n: Network): Promise<Protocol> {
	const [obj, st, utxos, supply] = await Promise.all([
		settle(gql<{ object: { asMoveObject: { contents: { json: { committee_set: { epoch: string; members: Sized } } } } } | null }>(
			n, `query($id: SuiAddress!) { object(address: $id) { asMoveObject { contents { json } } } }`, { id: n.hashiObjectId },
		)),
		settle(bitcoinState(n)),
		settle(activeUtxos(n)),
		settle(hbtcSupply(n)),
	]);
	const cs = obj?.object?.asMoveObject.contents.json.committee_set;
	return {
		committeeMembers: cs ? Number(cs.members.size) : null,
		committeeEpoch: cs ? Number(cs.epoch) : null,
		supplySats: supply,
		heldSats: utxos ? utxos.reduce((a, u) => a + u.amountSats, 0n) : null,
		utxoCount: utxos?.length ?? null,
		depositsInFlight: st ? Number(st.deposit_queue.requests.size) : null,
		depositsDone: st ? Number(st.deposit_queue.processed.size) : null,
		withdrawalsInFlight: st ? Number(st.withdrawal_queue.requests.size) + Number(st.withdrawal_queue.withdrawal_txns.size) : null,
		withdrawalsDone: st ? Number(st.withdrawal_queue.processed.size) : null,
	};
}

export type Activity = { kind: 'deposit' | 'withdrawal'; digest: string; timestampMs: number; amountSats: bigint; who: string };

/** The latest deposit and withdrawal requests anyone made, newest first. */
export async function recentActivity(n: Network, last = 6): Promise<Activity[]> {
	type Ev = { events: { nodes: { timestamp: string; transaction: { digest: string } | null; contents: { json: Record<string, string> } }[] } };
	const q = `query($t: String!, $n: Int!) { events(last: $n, filter: { type: $t }) { nodes { timestamp transaction { digest } contents { json } } } }`;
	const [d, w] = await Promise.all([
		gql<Ev>(n, q, { t: `${n.packageId}::deposit::DepositRequested`, n: last }),
		gql<Ev>(n, q, { t: `${n.packageId}::withdrawal_queue::WithdrawalRequested`, n: last }),
	]);
	const rows: Activity[] = [
		...d.events.nodes.map((e) => ({ kind: 'deposit' as const, digest: e.transaction?.digest ?? '', timestampMs: Date.parse(e.timestamp), amountSats: BigInt(e.contents.json.amount ?? 0), who: e.contents.json.derivation_path ?? '' })),
		...w.events.nodes.map((e) => ({ kind: 'withdrawal' as const, digest: e.transaction?.digest ?? '', timestampMs: Date.parse(e.timestamp), amountSats: BigInt(e.contents.json.btc_amount ?? 0), who: e.contents.json.requester_address ?? '' })),
	];
	return rows.filter((r) => r.digest).sort((a, b) => b.timestampMs - a.timestampMs).slice(0, last * 2);
}
