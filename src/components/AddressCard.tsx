// Deposit: your own Bitcoin address, the payments that reached it, and recording them on Sui.
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { PTB, recordTx } from '../lib/actions';
import { isTxid, paymentsInTx, paymentsTo, tipHeight, type Payment } from '../lib/bitcoin';
import { btc, short } from '../lib/format';
import { btcAddrUrl, btcTxUrl, type NetworkId } from '../lib/networks';
import { run, type Stage } from '../lib/sign';
import { remember } from '../lib/track';
import { Copy, Err, errText, useFerry, usePoll } from './ui';

type Row = { p: Payment; confs: number; used: boolean | null; digest: string | null };

const RKEY = (id: NetworkId) => `ferry:v1:${id}:recorded`;
const recordedMap = (id: NetworkId): Record<string, string> => {
	try { return JSON.parse(localStorage.getItem(RKEY(id)) ?? '{}') ?? {}; } catch { return {}; }
};
const markRecorded = (id: NetworkId, ps: Payment[], digest: string) => {
	try { const m = recordedMap(id); ps.forEach((p) => (m[`${p.txid}:${p.vout}`] = digest)); localStorage.setItem(RKEY(id), JSON.stringify(m)); } catch { /* ignore */ }
};

const STAGE: Record<Stage, string> = { building: 'Building the PTB', simulating: 'Simulating', signing: 'Sign in your wallet', executing: 'Sending to Sui' };

export function AddressCard() {
	const { n, client, cfg, owner, who, chainOk, tick, bump, follow } = useFerry();
	const addr = usePoll(() => (owner ? client.hashi.generateDepositAddress({ suiAddress: owner }) : Promise.resolve(null)), [n.id, owner]);
	const [qr, setQr] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [manual, setManual] = useState('');
	const [manualRows, setManualRows] = useState<Payment[] | null | undefined>(undefined);

	useEffect(() => {
		setQr(null);
		if (addr.data) QRCode.toDataURL(`bitcoin:${addr.data}`, { margin: 1, width: 232, color: { dark: '#07080f', light: '#ffffff' } }).then(setQr, () => setQr(null));
	}, [addr.data]);

	const rows = usePoll<Row[] | null>(async () => {
		if (!addr.data || !owner) return null;
		const [list, tip, hist] = await Promise.all([
			paymentsTo(n, addr.data),
			tipHeight(n),
			client.hashi.view.transactionHistory(owner).catch(() => null),
		]);
		const extra = (manualRows ?? []).filter((m) => !list.some((p) => p.txid === m.txid && p.vout === m.vout));
		const all = [...extra, ...list];
		const used = all.length ? await client.hashi.view.findUsedUtxos(all.map((p) => ({ txid: `0x${p.txid}`, vout: p.vout }))) : [];
		const local = recordedMap(n.id);
		return all.map((p, i) => {
			const h = hist?.find((x) => x.kind === 'deposit' && x.btcTxid.replace(/^0x/, '').toLowerCase() === p.txid && x.btcVout === p.vout);
			return {
				p,
				confs: p.blockHeight ? Math.max(0, tip - p.blockHeight + 1) : 0,
				used: used[i]?.isUsed ?? null,
				digest: h?.suiTxDigest ?? local[`${p.txid}:${p.vout}`] ?? null,
			};
		});
	}, [n.id, addr.data, owner, tick, manualRows], 30_000);

	const min = cfg?.bitcoinDepositMinimum ?? null;
	const need = cfg ? Number(cfg.bitcoinConfirmationThreshold) : null;

	async function record(group: Row[]) {
		if (!who || !owner || !cfg) return;
		const outs = group.map((r) => r.p);
		setErr(null);
		setBusy(outs[0].txid);
		try {
			const r = await run({
				client, network: n, who, tx: recordTx(client, outs, owner),
				onStage: (s) => setBusy(`${outs[0].txid}|${STAGE[s]}`),
				onDigest: (d) => { remember(n.id, d); markRecorded(n.id, outs, d); },
			});
			follow(r.digest);
			bump();
		} catch (e) {
			setErr(errText(e));
		} finally {
			setBusy(null);
		}
	}

	async function lookUp() {
		setErr(null);
		if (!addr.data || !isTxid(manual)) return setErr('Paste a 64-character Bitcoin transaction id.');
		try {
			const found = await paymentsInTx(n, manual, addr.data);
			setManualRows(found);
			if (found === null) setErr('The Bitcoin node does not know this transaction yet. Wait for it to reach the mempool, then try again.');
			else if (!found.length) setErr('This transaction did not pay your deposit address.');
		} catch (e) {
			setErr(errText(e));
		}
	}

	const groups = new Map<string, Row[]>();
	(rows.data ?? []).forEach((r) => groups.set(r.p.txid, [...(groups.get(r.p.txid) ?? []), r]));

	return (
		<section className="card" id="deposit">
			<div className="card-head">
				<span className="eyebrow">[ Deposit ]</span>
				{n.real ? <span className="tag btc">Real BTC</span> : <span className="tag plain">{n.bitcoinLabel}</span>}
			</div>
			<h2>Your Bitcoin address</h2>
			<p className="lede">Hashi derives one Bitcoin address for every Sui address. Send BTC to it from any Bitcoin wallet, then record the payment on Sui. hBTC arrives after {need ?? '...'} confirmations and a safety delay.</p>

			{!owner ? (
				<p className="empty mt">Connect a Sui wallet, or look at any Sui address, to see its Bitcoin address.</p>
			) : addr.error ? (
				<Err>{addr.error}</Err>
			) : (
				<div className="addr mt">
					<div className="qr">{qr ? <img src={qr} alt="QR code of the deposit address" width={176} height={176} /> : <i className="spin" />}</div>
					<div className="addr-body">
						<span className="n">{n.bitcoinLabel} deposit address</span>
						<code className="big" data-testid="deposit-address">{addr.data ?? 'deriving...'}</code>
						<div className="row mt-s">
							{addr.data && <Copy text={addr.data} />}
							{addr.data && <a className="chip" href={btcAddrUrl(n, addr.data)} target="_blank" rel="noreferrer">Open in explorer</a>}
						</div>
						<p className="hint mt-s">
							For Sui address <code className="inl">{short(owner, 8, 6)}</code>. Minimum {min != null ? `${btc(min)} BTC` : '...'} per output.
							{n.real
								? ' Below it Hashi will not record the payment, and your own keys cannot spend from this address.'
								: ' Hashi testnet uses Bitcoin Signet, and its minimum is more than public faucets give.'}
						</p>
					</div>
				</div>
			)}

			{owner && addr.data && (
				<>
					<hr className="divider" />
					<div className="card-head tight">
						<span className="eyebrow muted">Payments to this address</span>
						<button className="icon" onClick={rows.reload} disabled={rows.loading}>{rows.loading ? 'Reading...' : 'Refresh'}</button>
					</div>
					{rows.error && <Err>Bitcoin read failed: {rows.error}</Err>}
					{rows.data && !rows.data.length && <p className="empty">No payment yet. Hashi does not scan Bitcoin: once you send, the payment shows here, then you record it.</p>}
					<div className="pays">
						{[...groups.entries()].map(([txid, group]) => {
							const open = group.filter((r) => r.used === false && !r.digest && min != null && r.p.amountSats >= min);
							const mine = busy?.startsWith(txid);
							return (
								<div className="pay" key={txid}>
									<div className="xfer-head">
										<a className="mono" href={btcTxUrl(n, txid)} target="_blank" rel="noreferrer">{short(txid, 10, 8)}</a>
										<span className={`tag ${group[0].confs >= (need ?? 6) ? 'good' : 'plain'}`}>
											{group[0].p.confirmed ? `${group[0].confs} conf` : 'in mempool'}
										</span>
									</div>
									{group.map((r) => (
										<div className="pay-out" key={r.p.vout}>
											<span className="mono">vout {r.p.vout}</span>
											<b>{btc(r.p.amountSats)} BTC</b>
											<span>
												{r.used ? <span className="tag good">In Hashi, hBTC minted</span>
													: r.digest ? <button className="chip" onClick={() => follow(r.digest!)}>Recorded, follow it</button>
													: r.used === null ? <span className="tag plain">checking</span>
													: min != null && r.p.amountSats < min ? <span className="tag warn">Below minimum</span>
													: <span className="tag">Not recorded</span>}
											</span>
										</div>
									))}
									{open.length > 0 && (
										<div className="row mt-s">
											<button onClick={() => record(open)} disabled={!who || !cfg || chainOk !== true || !!busy}>
												{mine ? <><i className="spin" />{busy!.split('|')[1] ?? 'Working'}</> : `Record ${open.length > 1 ? `${open.length} outputs` : 'on Sui'}`}
											</button>
											{!who && <span className="hint">Connect a wallet to pay the Sui gas.</span>}
											{who && who.address !== owner && <span className="hint">Your wallet pays the gas; the hBTC goes to {short(owner)}.</span>}
										</div>
									)}
								</div>
							);
						})}
					</div>
					<div className="inline mt">
						<input className="mono" placeholder="Or paste a Bitcoin txid that paid this address" value={manual} onChange={(e) => setManual(e.target.value.trim())} />
						<button className="ghost" onClick={lookUp} disabled={!manual}>Find outputs</button>
					</div>
					<Err>{err}</Err>
					<p className="ptb">{PTB.record}</p>
				</>
			)}
		</section>
	);
}
