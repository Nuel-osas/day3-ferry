// The one path every Hashi write takes in Ferry:
//   build the PTB with our client -> simulate it -> the wallet signs exactly those bytes -> we execute.
// A transaction that would abort (below the minimum, a UTXO already used, a cooldown not over) is
// stopped at the simulation and never reaches the wallet, so the user is not asked to sign a failure.
import { fromBase64 } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiSignAndExecuteTransactionFeature, SuiSignTransactionFeature } from '@mysten/wallet-standard';
import type { HashiSui } from './hashi';
import type { Network } from './networks';
import type { Connected } from './wallet';

export type Ran = { digest: string; events: { eventType: string; json: unknown }[] };
export type Stage = 'building' | 'simulating' | 'signing' | 'executing';

type Status = { success: true; error: null } | { success: false; error: { message: string } };

/** "MoveAbort in 3rd command, 'EUtxoAlreadyUsed': UTXO is already active or spent, in '0x..::utxo_pool::..'" -> the readable part. */
export function abortText(message: string): string {
	const named = message.match(/'(E[A-Za-z]+)': ([^,]+?)(?:, in '|$)/);
	return named ? `${named[2]} (${named[1]})` : message;
}

export async function simulate(client: HashiSui, sender: string, tx: Transaction): Promise<{ bytes: Uint8Array; status: Status }> {
	tx.setSenderIfNotSet(sender);
	const bytes = await tx.build({ client });
	const sim = await client.core.simulateTransaction({ transaction: bytes, include: { effects: true } });
	const status = (sim.Transaction ?? sim.FailedTransaction)?.effects?.status as Status | undefined;
	if (!status) throw new Error('The simulation returned no status');
	return { bytes, status };
}

/**
 * `onDigest` fires the moment the transaction is submitted, before we wait for it, so the caller can
 * save it first: if the tab closes or the wait times out, the transfer is still tracked, as pending.
 */
export async function run(o: {
	client: HashiSui; network: Network; who: Connected; tx: Transaction;
	onStage?: (s: Stage) => void; onDigest?: (digest: string) => void;
}): Promise<Ran> {
	const { client, network, who } = o;
	o.onStage?.('building');
	const { bytes, status } = await simulate(client, who.address, o.tx);
	o.onStage?.('simulating');
	if (!status.success) throw new Error(`This would fail on chain, so nothing was signed: ${abortText(status.error.message)}`);

	o.onStage?.('signing');
	const signTx = who.wallet.features['sui:signTransaction'] as SuiSignTransactionFeature['sui:signTransaction'] | undefined;
	const signExec = who.wallet.features['sui:signAndExecuteTransaction'] as SuiSignAndExecuteTransactionFeature['sui:signAndExecuteTransaction'] | undefined;
	const transaction = Transaction.from(bytes);
	let digest: string;
	if (signTx) {
		const signed = await signTx.signTransaction({ transaction, account: who.account, chain: network.chain });
		o.onStage?.('executing');
		const r = await client.core.executeTransaction({ transaction: fromBase64(signed.bytes), signatures: [signed.signature] });
		digest = (r.Transaction ?? r.FailedTransaction)!.digest;
	} else if (signExec) {
		const r = await signExec.signAndExecuteTransaction({ transaction, account: who.account, chain: network.chain });
		o.onStage?.('executing');
		digest = r.digest;
	} else {
		throw new Error(`${who.wallet.name} cannot sign Sui transactions`);
	}
	o.onDigest?.(digest);

	const done = await client.core.waitForTransaction({ digest, include: { effects: true, events: true }, timeout: 60_000 });
	const t = done.Transaction ?? done.FailedTransaction;
	const st = t?.effects?.status as Status | undefined;
	if (st && !st.success) throw new Error(`The transaction ran and failed: ${abortText(st.error.message)} (${digest})`);
	return { digest, events: (t?.events ?? []) as Ran['events'] };
}
