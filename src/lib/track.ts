// Following a deposit or a withdrawal from its Sui digest. The chain is the source of truth: the
// browser only remembers which digests this viewer asked to follow. Anything ambiguous shows as
// pending, never as failed, so nobody records or withdraws twice.
import type { DepositInfo, GovernanceConfig, WithdrawalInfo } from '@mysten/hashi';
import { confirmations, type TxConfirmations } from './bitcoin';
import type { HashiSui } from './hashi';
import type { Network, NetworkId } from './networks';

export type Step = { label: string; state: 'done' | 'now' | 'wait' | 'bad'; detail?: string };

export type DepositView = { kind: 'deposit'; info: DepositInfo; btc: TxConfirmations | null; steps: Step[]; done: boolean; note?: string };
export type WithdrawalView = {
	kind: 'withdrawal'; info: WithdrawalInfo; btc: TxConfirmations | null; steps: Step[]; done: boolean;
	cancelAtMs: number | null; cancellable: boolean; note?: string;
};
export type View = DepositView | WithdrawalView;

/** Hashi's deposit_queue.move: a request that is not confirmed within a day can be deleted. */
export const DEPOSIT_REQUEST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function depositSteps(info: DepositInfo, btc: TxConfirmations | null, cfg: GovernanceConfig, now = Date.now()): { steps: Step[]; done: boolean; note?: string } {
	const need = Number(cfg.bitcoinConfirmationThreshold);
	const minted = info.status === 'confirmed';
	const approved = info.approvalTimestampMs != null;
	const confs = btc?.confirmations ?? 0;
	const enough = minted || approved || confs >= need;
	const mintAt = info.confirmableAtMs != null ? Number(info.confirmableAtMs) : null;
	const steps: Step[] = [
		{ label: 'Sent on Bitcoin', state: minted || btc?.seen ? 'done' : btc ? 'now' : 'wait', detail: btc && !btc.seen && !minted ? 'not seen by the Bitcoin node yet' : undefined },
		{ label: `${need} confirmations`, state: enough ? 'done' : btc?.seen ? 'now' : 'wait', detail: enough ? undefined : `${confs} of ${need}` },
		{ label: 'Recorded on Sui', state: 'done' },
		{ label: 'Committee approved', state: minted || approved ? 'done' : enough ? 'now' : 'wait', detail: approved && info.approvalTimestampMs ? new Date(Number(info.approvalTimestampMs)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : enough ? 'the committee checks Bitcoin and signs' : undefined },
		{ label: 'Safety delay', state: minted ? 'done' : mintAt == null ? 'wait' : now >= mintAt ? 'done' : 'now', detail: !minted && mintAt != null ? (now >= mintAt ? 'over, minting next' : `hBTC from ${new Date(mintAt).toLocaleTimeString()}`) : undefined },
		{ label: 'hBTC minted', state: minted ? 'done' : 'wait' },
	];
	if (info.status === 'expired') {
		return { steps: steps.map((s) => (s.state === 'done' ? s : { ...s, state: 'bad' })), done: true, note: 'This request expired before the committee confirmed it. Nothing was minted and the BTC is still at your deposit address: record it again.' };
	}
	const old = !minted && now - Number(info.timestampMs) > DEPOSIT_REQUEST_MAX_AGE_MS;
	return { steps, done: minted, note: old ? 'Older than a day and not minted: this request can expire. If it does, record the same output again.' : undefined };
}

const W_ORDER = ['Requested', 'Approved', 'Processing', 'Signed', 'Confirmed'] as const;

export function withdrawalSteps(info: WithdrawalInfo, btc: TxConfirmations | null, cfg: GovernanceConfig, now = Date.now()) {
	const cancelled = info.status === 'cancelled';
	const at = cancelled ? -1 : W_ORDER.indexOf(info.status as (typeof W_ORDER)[number]);
	const label: Record<(typeof W_ORDER)[number], string> = {
		Requested: 'Requested, hBTC locked',
		Approved: 'Committee approved',
		Processing: 'In a Bitcoin batch, hBTC burned',
		Signed: 'Signed by committee and guardian',
		Confirmed: 'BTC confirmed on Bitcoin',
	};
	const steps: Step[] = W_ORDER.map((s, i) => ({
		label: label[s],
		state: cancelled ? (i === 0 ? 'done' : 'bad') : i <= at ? 'done' : i === at + 1 ? 'now' : 'wait',
		detail: s === 'Signed' && info.btcTxid && btc ? (btc.seen ? `${btc.confirmations} confirmation${btc.confirmations === 1 ? '' : 's'}` : 'broadcasting') : undefined,
	}));
	const cancelAtMs = Number(info.timestampMs) + Number(cfg.withdrawalCancellationCooldownMs);
	const open = info.status === 'Requested' || info.status === 'Approved';
	return {
		steps,
		done: cancelled || info.status === 'Confirmed',
		cancelAtMs: open ? cancelAtMs : null,
		cancellable: open && now >= cancelAtMs,
		note: cancelled ? 'Cancelled. The locked hBTC went back to the requester.' : undefined,
	};
}

/** Look a digest up as a deposit first, then as a withdrawal. Null if it is neither. */
export async function follow(client: HashiSui, n: Network, cfg: GovernanceConfig, digest: string): Promise<View | null> {
	const dep = await client.hashi.view.depositStatus(digest).catch(() => null);
	if (dep) {
		const btc = dep.status === 'confirmed' ? null : await confirmations(n, dep.btcTxid).catch(() => null);
		return { kind: 'deposit', info: dep, btc, ...depositSteps(dep, btc, cfg) };
	}
	const w = await client.hashi.view.withdrawalStatus(digest);
	if (!w) return null;
	const btc = w.btcTxid ? await confirmations(n, w.btcTxid).catch(() => null) : null;
	return { kind: 'withdrawal', info: w, btc, ...withdrawalSteps(w, btc, cfg) };
}

// --- what this viewer follows (a convenience: the list of digests, nothing else) ---

const KEY = (id: NetworkId) => `ferry:v1:${id}:followed`;

export function followed(id: NetworkId): string[] {
	try {
		const v = JSON.parse(localStorage.getItem(KEY(id)) ?? '[]');
		return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
	} catch {
		return [];
	}
}

export function remember(id: NetworkId, digest: string) {
	try {
		const list = [digest, ...followed(id).filter((d) => d !== digest)].slice(0, 30);
		localStorage.setItem(KEY(id), JSON.stringify(list));
	} catch {
		/* storage blocked: the chain still has it */
	}
}

export function forget(id: NetworkId, digest: string) {
	try {
		localStorage.setItem(KEY(id), JSON.stringify(followed(id).filter((d) => d !== digest)));
	} catch {
		/* ignore */
	}
}
