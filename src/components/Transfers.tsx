// Follow any deposit or withdrawal by its Sui digest: yours from the chain's own index, ones this
// browser recorded, any digest pasted in, and the latest requests anyone made on Hashi.
import { useState } from 'react';
import { cancelTx, PTB } from '../lib/actions';
import { ago, btc, duration, short } from '../lib/format';
import { btcTxUrl, suiTxUrl } from '../lib/networks';
import { recentActivity } from '../lib/protocol';
import { run } from '../lib/sign';
import { follow as followDigest, forget, type View } from '../lib/track';
import { Err, errText, Steps, useFerry, useNow, usePoll } from './ui';

export function Transfers({ followed }: { followed: string[] }) {
	const { n, client, owner, tick, follow } = useFerry();
	const [q, setQ] = useState('');
	const hist = usePoll(() => (owner ? client.hashi.view.transactionHistory(owner) : Promise.resolve([])), [n.id, owner, tick], 60_000);
	const fromChain = (hist.data ?? []).map((h) => h.suiTxDigest);
	const digests = [...new Set([...followed, ...fromChain])];

	return (
		<section className="card full" id="transfers">
			<div className="card-head">
				<span className="eyebrow">[ Track ]</span>
				<span className="count">{digests.length} followed</span>
			</div>
			<h2>Deposits and withdrawals</h2>
			<p className="lede">Every Hashi request is a Sui transaction. Paste any digest to follow it to the end: yours, or anyone's.</p>
			<div className="inline mt">
				<input className="mono" placeholder="Sui transaction digest" value={q} onChange={(e) => setQ(e.target.value.trim())} onKeyDown={(e) => { if (e.key === 'Enter' && q) { follow(q); setQ(''); } }} />
				<button className="ghost" onClick={() => { follow(q); setQ(''); }} disabled={!/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(q)}>Follow</button>
			</div>
			{hist.error && <Err>History read failed: {hist.error}</Err>}
			<div className="xfers mt">
				{digests.length === 0 && <p className="empty">Nothing followed yet. Record a deposit, request a withdrawal, or pick one from the latest on Hashi below.</p>}
				{digests.map((d) => <Tracker key={`${n.id}:${d}`} digest={d} mine={fromChain.includes(d)} />)}
			</div>
			<Latest />
		</section>
	);
}

function Tracker({ digest, mine }: { digest: string; mine: boolean }) {
	const { n, client, cfg, who, tick, bump, follow } = useFerry();
	const now = useNow();
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const v = usePoll<View | null>(() => (cfg ? followDigest(client, n, cfg, digest) : Promise.resolve(null)), [n.id, digest, !!cfg, tick], 20_000);
	const x = v.data;

	async function cancel() {
		if (!who || x?.kind !== 'withdrawal') return;
		setErr(null);
		setBusy(true);
		try {
			const r = await run({ client, network: n, who, tx: cancelTx(client, n, x.info.requestId, who.address) });
			follow(r.digest);
			bump();
		} catch (e) {
			setErr(errText(e));
		} finally {
			setBusy(false);
		}
	}

	if (!x) {
		return (
			<div className="xfer">
				<div className="xfer-head">
					<a className="mono" href={suiTxUrl(n, digest)} target="_blank" rel="noreferrer">{short(digest, 10, 8)}</a>
					<span className="row">
						<span className="tag plain">{v.loading ? 'reading' : v.error ? 'pending' : 'not a Hashi request'}</span>
						{!mine && <button className="icon" onClick={() => { forget(n.id, digest); bump(); }}>Remove</button>}
					</span>
				</div>
				{v.error && <p className="note">Could not read it yet ({v.error}). It stays here as pending.</p>}
			</div>
		);
	}

	const amount = x.kind === 'deposit' ? x.info.amountSats : x.info.btcAmountSats;
	const status = x.kind === 'deposit' ? x.info.status : x.info.status;
	const good = status === 'confirmed' || status === 'Confirmed';
	const bad = status === 'expired' || status === 'cancelled';
	return (
		<div className="xfer" data-testid={`xfer-${x.kind}`}>
			<div className="xfer-head">
				<strong>{x.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} · {btc(amount)} BTC</strong>
				<span className="row">
					<span className={`tag ${good ? 'good' : bad ? 'warn' : ''}`}>{x.kind === 'deposit' ? (good ? 'hBTC minted' : bad ? 'expired' : 'in progress') : good ? 'BTC sent' : bad ? 'cancelled' : status}</span>
					{!mine && <button className="icon" onClick={() => { forget(n.id, digest); bump(); }}>Remove</button>}
				</span>
			</div>
			<Steps steps={x.steps} />
			<div className="links">
				<span>Sui <a href={suiTxUrl(n, digest)} target="_blank" rel="noreferrer">{digest}</a> · {ago(Number(x.info.timestampMs))}</span>
				{x.kind === 'deposit' && <span>Bitcoin <a href={btcTxUrl(n, x.info.btcTxid)} target="_blank" rel="noreferrer">{x.info.btcTxid.replace(/^0x/, '')}</a> : {x.info.btcVout}</span>}
				{x.kind === 'deposit' && x.info.recipient && <span>hBTC to <span className="mono">{short(x.info.recipient, 10, 6)}</span></span>}
				{x.kind === 'withdrawal' && x.info.btcTxid && <span>Bitcoin <a href={btcTxUrl(n, x.info.btcTxid)} target="_blank" rel="noreferrer">{x.info.btcTxid.replace(/^0x/, '')}</a></span>}
			</div>
			{x.note && <p className="note">{x.note}</p>}
			{x.kind === 'withdrawal' && x.cancelAtMs != null && who?.address === x.info.sender && (
				<div className="row mt-s">
					<button className="danger" onClick={cancel} disabled={!x.cancellable || busy}>
						{busy ? <><i className="spin" />Cancelling</> : x.cancellable || now >= x.cancelAtMs ? 'Cancel and refund hBTC' : `Cancel in ${duration(x.cancelAtMs - now)}`}
					</button>
					<span className="ptb">{PTB.cancel}</span>
				</div>
			)}
			<Err>{err}</Err>
		</div>
	);
}

function Latest() {
	const { n, follow } = useFerry();
	const a = usePoll(() => recentActivity(n, 5), [n.id], 60_000);
	return (
		<>
			<hr className="divider" />
			<div className="card-head tight">
				<span className="eyebrow muted">Latest on Hashi {n.label.toLowerCase()}</span>
				<button className="icon" onClick={a.reload} disabled={a.loading}>{a.loading ? 'Reading...' : 'Refresh'}</button>
			</div>
			{a.error && <Err>{a.error}</Err>}
			{a.data && !a.data.length && <p className="empty">No requests yet.</p>}
			<ul className="log">
				{(a.data ?? []).map((r) => (
					<li key={r.digest}>
						<span className={`pip ${r.kind}`} />
						<span className="what">{r.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} of <b>{btc(r.amountSats)} BTC</b> <span className="hint">· {ago(r.timestampMs)}</span></span>
						<button className="chip" onClick={() => follow(r.digest)}>Follow</button>
					</li>
				))}
			</ul>
		</>
	);
}
