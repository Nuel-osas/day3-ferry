// Withdraw: lock hBTC on Sui, the committee batches it into a Bitcoin transaction, the guardian
// co-signs, and BTC lands at the address you give. The miner fee comes out of the amount.
import { useMemo, useState } from 'react';
import { PTB, withdrawTx, witnessProgram } from '../lib/actions';
import { btc, duration, parseBtc } from '../lib/format';
import { run, type Stage } from '../lib/sign';
import { remember } from '../lib/track';
import { Err, errText, useFerry, usePoll } from './ui';

const STAGE: Record<Stage, string> = { building: 'Building the PTB', simulating: 'Simulating', signing: 'Sign in your wallet', executing: 'Sending to Sui' };

export function WithdrawCard() {
	const { n, client, cfg, owner, who, tick, bump, follow } = useFerry();
	const [amount, setAmount] = useState('');
	const [to, setTo] = useState('');
	const [checked, setChecked] = useState(false);
	const [busy, setBusy] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);

	const bal = usePoll(() => (owner ? client.hashi.view.balance(owner) : Promise.resolve(null)), [n.id, owner, tick], 30_000);
	const fees = usePoll(() => client.hashi.view.withdrawalFees(), [n.id]);

	const sats = parseBtc(amount);
	const guard = usePoll(
		() => (sats && sats > 0n ? client.hashi.guardian.canWithdraw(sats) : Promise.resolve(null)),
		[n.id, sats?.toString()],
	);

	const addrError = useMemo(() => {
		if (!to.trim()) return null;
		try { witnessProgram(n, to); return null; } catch (e) { return errText(e); }
	}, [n, to]);

	const min = fees.data?.withdrawalMinimumSats ?? null;
	const fee = fees.data?.worstCaseNetworkFeeSats ?? null;
	const have = bal.data?.totalBalance ?? null;
	const problem =
		!owner ? 'Connect a wallet to see your hBTC.'
		: !amount ? null
		: sats == null || sats === 0n ? 'Enter an amount in BTC, up to 8 decimals.'
		: min == null || fee == null || have == null ? 'Waiting for the balance and fees.'
		: sats < min ? `The minimum is ${btc(min)} BTC.`
		: sats > have ? `You hold ${btc(have)} hBTC.`
		: null;
	const ready = !!who && who.address === owner && !!cfg && !problem && !!sats && !!to && !addrError && (!n.real || checked);

	async function go() {
		if (!who || !sats) return;
		setErr(null);
		setBusy('Working');
		try {
			const r = await run({
				client, network: n, who, tx: withdrawTx(client, n, sats, to),
				onStage: (s) => setBusy(STAGE[s]),
				onDigest: (d) => remember(n.id, d),
			});
			follow(r.digest);
			setAmount('');
			bump();
		} catch (e) {
			setErr(errText(e));
		} finally {
			setBusy(null);
		}
	}

	return (
		<section className="card" id="withdraw">
			<div className="card-head">
				<span className="eyebrow">[ Withdraw ]</span>
				<span className="tag plain">hBTC to BTC</span>
			</div>
			<h2>Back to Bitcoin</h2>
			<div className="bals">
				<div className="bal">
					<div className="num" data-testid="hbtc-balance">{owner ? (have == null ? (bal.error ? 'unknown' : '...') : btc(have)) : '0'}</div>
					<div className="sym">hBTC</div>
				</div>
			</div>

			<label className="field">
				<span>Amount</span>
				<div className="amount">
					<input inputMode="decimal" placeholder="0.0003" value={amount} onChange={(e) => setAmount(e.target.value)} />
					<span className="sym">BTC</span>
					{have != null && have > 0n && <button className="icon" onClick={() => setAmount(btc(have).replace(/,/g, ''))}>Max</button>}
				</div>
			</label>
			<label className="field">
				<span>To {n.bitcoinLabel} address</span>
				<input className="mono" placeholder={n.real ? 'bc1q... or bc1p...' : 'tb1q... or tb1p...'} value={to} onChange={(e) => setTo(e.target.value.trim())} />
			</label>
			{addrError && <Err>{addrError}</Err>}

			<div className="quote">
				<div><span>Minimum</span><b>{min != null ? `${btc(min)} BTC` : '...'}</b></div>
				<div><span>Bitcoin miner fee, at most</span><b>{fee != null ? `${btc(fee)} BTC` : '...'}</b></div>
				<div><span>Cancel allowed after</span><b>{cfg ? duration(Number(cfg.withdrawalCancellationCooldownMs)) : '...'}</b></div>
				<div><span>Guardian can sign now</span><b>{!sats ? '...' : guard.data ? (guard.data.allowed ? 'yes' : `in about ${duration(Number(guard.data.estimatedWaitSecs) * 1000)}`) : guard.error ? 'unknown' : '...'}</b></div>
				<div className="total"><span>You receive at least</span><b>{sats && fee != null && sats > fee ? `${btc(sats - fee)} BTC` : '...'}</b></div>
			</div>
			<p className="hint mt-s">The fee is the protocol's worst case: Hashi takes the real miner fee from your amount when it batches the Bitcoin transaction, never more than this.</p>

			{n.real && (
				<label className="check mt">
					<input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
					<span>I checked the Bitcoin address. Once the committee puts it in a batch, this cannot be undone.</span>
				</label>
			)}
			<div className="row mt">
				<button className="lg" onClick={go} disabled={!ready || !!busy}>{busy ? <><i className="spin" />{busy}</> : 'Request withdrawal'}</button>
				{who && owner && who.address !== owner && <span className="hint">You are looking at another address. Only its owner can withdraw.</span>}
			</div>
			<Err>{problem ?? err}</Err>
			<p className="ptb">{PTB.withdraw}</p>
		</section>
	);
}
