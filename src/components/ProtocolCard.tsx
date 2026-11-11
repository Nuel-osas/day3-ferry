// Hashi, live: governance values from view.all(), the guardian's rate limiter, and the reserve check
// (BTC Hashi holds against hBTC minted), read from Sui every 30 seconds.
import { btc, duration, short } from '../lib/format';
import { readProtocol } from '../lib/protocol';
import { suiAddrUrl } from '../lib/networks';
import { Stat, useFerry, usePoll } from './ui';

export function ProtocolCard() {
	const { n, client, cfg, chainOk } = useFerry();
	const p = usePoll(() => readProtocol(n), [n.id], 30_000);
	const lim = usePoll(() => client.hashi.guardian.limiterStatus(), [n.id], 30_000);
	const fees = usePoll(() => client.hashi.view.withdrawalFees(), [n.id]);
	const d = p.data;
	// "..." while reading; a read that failed is "unknown", never zero.
	const v = <T,>(x: T | null | undefined, f: (x: T) => string, loading: boolean) => (x != null ? f(x) : loading ? '...' : 'unknown');
	const pl = p.loading && !d;
	const backed = d?.supplySats != null && d.heldSats != null ? d.heldSats - d.supplySats : null;

	return (
		<section className="card" id="protocol">
			<div className="card-head">
				<span className="eyebrow">[ Hashi, live ]</span>
				<span className={`tag ${cfg?.paused ? 'warn' : cfg ? 'good' : 'plain'}`}>{cfg ? (cfg.paused ? 'Paused' : 'Open') : 'reading'}</span>
			</div>
			<h2>{n.label} protocol</h2>
			<div className="stats">
				<Stat n="hBTC minted">{v(d?.supplySats, btc, pl)}</Stat>
				<Stat n="BTC held" tag={backed == null ? null : backed === 0n ? <span className="tag good mt-s" data-testid="reserve">1 : 1</span> : <span className="tag warn mt-s">{backed > 0n ? '+' : ''}{btc(backed)} in flight</span>}>
					{v(d?.heldSats, btc, pl)}
				</Stat>
				<Stat n="Bitcoin outputs held">{v(d?.utxoCount, String, pl)}</Stat>
				<Stat n="Committee">{v(d?.committeeMembers, (m) => `${m} validators`, pl)}</Stat>
				<Stat n="Minimum in / out">{cfg ? `${btc(cfg.bitcoinDepositMinimum)} / ${btc(cfg.bitcoinWithdrawalMinimum)}` : '...'}</Stat>
				<Stat n="Confirmations, then delay">{cfg ? `${cfg.bitcoinConfirmationThreshold}, then ${duration(Number(cfg.bitcoinDepositTimeDelayMs))}` : '...'}</Stat>
				<Stat n="Miner fee, at most">{fees.data ? `${btc(fees.data.worstCaseNetworkFeeSats)} BTC` : '...'}</Stat>
				<Stat n="Cancel cooldown">{cfg ? duration(Number(cfg.withdrawalCancellationCooldownMs)) : '...'}</Stat>
				<Stat n="Guardian can sign now">
					{lim.data ? `${btc(lim.data.availableNowSats)} BTC` : lim.error ? 'unknown' : '...'}
				</Stat>
				<Stat n="Guardian refill">
					{lim.data ? `about ${btc(((lim.data.config.refillRateSatsPerSec * 86_400n + 50_000_000n) / 100_000_000n) * 100_000_000n)} BTC a day` : lim.error ? 'unknown' : '...'}
				</Stat>
				<Stat n="In flight">{v(d?.depositsInFlight, (x) => `${x} in, ${d!.withdrawalsInFlight} out`, pl)}</Stat>
				<Stat n="Done so far">{v(d?.depositsDone, (x) => `${x} in, ${d!.withdrawalsDone} out`, pl)}</Stat>
			</div>
			<div className="links">
				<span>
					Bitcoin data source{' '}
					{chainOk === null ? 'checking...' : chainOk ? <span className="tag good">same chain as Hashi</span> : <span className="tag warn">not Hashi's chain: recording is off</span>}
				</span>
				<span>Hashi object <a href={suiAddrUrl(n, n.hashiObjectId).replace('/account/', '/object/')} target="_blank" rel="noreferrer">{short(n.hashiObjectId, 10, 6)}</a></span>
			</div>
			{p.error && <p className="note">The protocol read failed: {p.error}</p>}
		</section>
	);
}
