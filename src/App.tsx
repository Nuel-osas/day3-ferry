import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddressCard } from './components/AddressCard';
import { ProtocolCard } from './components/ProtocolCard';
import { Transfers } from './components/Transfers';
import { FerryCtx, usePoll, type Ferry } from './components/ui';
import { WithdrawCard } from './components/WithdrawCard';
import { esplora, reverseHex } from './lib/bitcoin';
import { short } from './lib/format';
import { clientFor } from './lib/hashi';
import { NETWORKS, suiAddrUrl, type NetworkId } from './lib/networks';
import { followed as readFollowed, remember } from './lib/track';
import { useWallet } from './lib/wallet';

const startNet = (): NetworkId => {
	const q = new URLSearchParams(location.search).get('net');
	if (q === 'mainnet' || q === 'testnet') return q;
	try { const s = localStorage.getItem('ferry:v1:net'); if (s === 'mainnet' || s === 'testnet') return s; } catch { /* ignore */ }
	return 'mainnet';
};

export function App() {
	const [netId, setNetId] = useState<NetworkId>(startNet);
	const n = NETWORKS[netId];
	const client = useMemo(() => clientFor(n), [n]);
	const { wallets, connected, connect, disconnect } = useWallet();
	const [watch, setWatch] = useState('');
	const [walletErr, setWalletErr] = useState<string | null>(null);
	const [tick, setTick] = useState(0);
	const [followed, setFollowed] = useState<string[]>(() => readFollowed(netId));

	useEffect(() => {
		setFollowed(readFollowed(netId));
		try { localStorage.setItem('ferry:v1:net', netId); } catch { /* ignore */ }
		const u = new URL(location.href);
		u.searchParams.set('net', netId);
		history.replaceState(null, '', u);
	}, [netId]);

	const cfg = usePoll(() => client.hashi.view.all(), [netId], 60_000);
	// Fail closed: only record deposits if our Bitcoin data source is the chain Hashi watches.
	const chain = usePoll(async () => (await esplora<string>(n, '/block-height/0', 'text')) === reverseHex(cfg.data!.bitcoinChainId), [netId, !!cfg.data], 0);

	const watched = watch && isValidSuiAddress(normalizeSuiAddress(watch)) ? normalizeSuiAddress(watch) : null;
	const owner = connected?.address ?? watched;

	const bump = useCallback(() => { setTick((t) => t + 1); setFollowed(readFollowed(netId)); }, [netId]);
	const follow = useCallback((d: string) => {
		remember(netId, d);
		setFollowed(readFollowed(netId));
		setTimeout(() => document.getElementById('transfers')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
	}, [netId]);

	const ctx: Ferry = {
		n, client, cfg: cfg.data, chainOk: cfg.data ? (chain.data ?? (chain.error ? false : null)) : null,
		owner, who: connected, tick, bump, follow,
	};

	return (
		<FerryCtx.Provider value={ctx}>
			<div className="page">
				<header className="top">
					<div className="brand"><img src="/favicon.svg" alt="" /> Ferry</div>
					<div className="row">
						<div className="seg" role="tablist" aria-label="Network">
							{(['mainnet', 'testnet'] as const).map((id) => (
								<button key={id} className={id === netId ? 'on' : ''} onClick={() => setNetId(id)}>{NETWORKS[id].label}</button>
							))}
						</div>
					</div>
				</header>

				<section className="hero card">
					<span className="eyebrow">[ Day 3 · Build with Hashi ]</span>
					<h1 className="headline">Bitcoin on Sui.<span className="soft">Your BTC stays on Bitcoin.</span></h1>
					<p className="lede">Hashi holds BTC at an address that Sui's validator committee and an independent guardian control together, and mints hBTC on Sui against it, one for one. Ferry is a small app on the Hashi SDK: your deposit address, recording, tracking, and the way back.</p>
					<div className="wallet-bar">
						{connected ? (
							<div className="acct">
								{connected.wallet.icon && <img className="wicon" src={connected.wallet.icon} alt="" />}
								<a href={suiAddrUrl(n, connected.address)} target="_blank" rel="noreferrer" data-testid="connected">{short(connected.address, 8, 6)}</a>
								<button className="icon" onClick={disconnect}>Disconnect</button>
							</div>
						) : wallets.length ? (
							<div className="row">
								{wallets.map((w) => (
									<button key={w.name} onClick={() => { setWalletErr(null); connect(w).catch((e) => setWalletErr(String(e?.message ?? e))); }}>
										{w.icon && <img className="wicon" src={w.icon} alt="" />}Connect {w.name}
									</button>
								))}
							</div>
						) : (
							<a className="chip" href="https://slush.app" target="_blank" rel="noreferrer">Install Slush to connect a Sui wallet</a>
						)}
						{!connected && (
							<input className="mono watch" placeholder="or look at any Sui address 0x..." value={watch} onChange={(e) => setWatch(e.target.value.trim())} />
						)}
					</div>
					{walletErr && <p className="inline-err">{walletErr}</p>}
					{cfg.error && <p className="inline-err">Could not read Hashi on {n.label}: {cfg.error}</p>}
				</section>

				<div className="grid mt">
					<div className="stack">
						<AddressCard />
						<WithdrawCard />
					</div>
					<div className="stack">
						<ProtocolCard />
					</div>
					<Transfers followed={followed} />
				</div>

				<footer className="foot">
					<span>SuiHub Lagos · Keys, Dollars and Bitcoin · Day 3</span>
					<span>
						<a href="https://github.com/MystenLabs/hashi" target="_blank" rel="noreferrer">Hashi</a> ·{' '}
						<a href="https://www.npmjs.com/package/@mysten/hashi" target="_blank" rel="noreferrer">@mysten/hashi 0.6.29</a> ·{' '}
						<a href="https://github.com/Nuel-osas/day3-ferry" target="_blank" rel="noreferrer">source</a>
					</span>
				</footer>
			</div>
		</FerryCtx.Provider>
	);
}
