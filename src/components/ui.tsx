import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { GovernanceConfig } from '@mysten/hashi';
import type { HashiSui } from '../lib/hashi';
import type { Network } from '../lib/networks';
import type { Step } from '../lib/track';
import type { Connected } from '../lib/wallet';

export type Ferry = {
	n: Network;
	client: HashiSui;
	/** Governance snapshot (minimums, confirmations, delays). Null until read; writes wait for it. */
	cfg: GovernanceConfig | null;
	/** True once the Bitcoin data source is proven to be the chain Hashi watches; null while checking. */
	chainOk: boolean | null;
	/** The Sui address we show: the connected wallet, or one the viewer typed in to look at. */
	owner: string | null;
	who: Connected | null;
	tick: number;
	bump: () => void;
	follow: (digest: string) => void;
};

export const FerryCtx = createContext<Ferry | null>(null);
export const useFerry = () => useContext(FerryCtx)!;

/** Run `fn` now, again when `deps` change, and every `everyMs` while mounted. Keeps the last good value. */
export function usePoll<T>(fn: () => Promise<T>, deps: unknown[], everyMs = 0): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [n, setN] = useState(0);
	const fnRef = useRef(fn);
	fnRef.current = fn;
	useEffect(() => {
		let alive = true;
		const go = () => {
			setLoading(true);
			fnRef.current().then(
				(d) => { if (alive) { setData(d); setError(null); setLoading(false); } },
				(e) => { if (alive) { setError(e instanceof Error ? e.message : String(e)); setLoading(false); } },
			);
		};
		setData(null);
		go();
		const t = everyMs ? setInterval(go, everyMs) : undefined;
		return () => { alive = false; if (t) clearInterval(t); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...deps, n]);
	return { data, error, loading, reload: useCallback(() => setN((x) => x + 1), []) };
}

/** Re-render every second, for countdowns. */
export function useNow(ms = 1000) {
	const [now, setNow] = useState(Date.now());
	useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
	return now;
}

export function Copy({ text, label = 'Copy' }: { text: string; label?: string }) {
	const [done, setDone] = useState(false);
	return (
		<button className="icon" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }).catch(() => {}); }}>
			{done ? 'Copied' : label}
		</button>
	);
}

export function Steps({ steps }: { steps: Step[] }) {
	return (
		<ol className="steps-v">
			{steps.map((s, i) => (
				<li key={i} className={s.state}>
					<span className="pip">{s.state === 'done' ? '✓' : s.state === 'bad' ? '×' : s.state === 'now' ? <i className="spin" /> : i + 1}</span>
					<span className="lbl">{s.label}</span>
					{s.detail && <span className="det">{s.detail}</span>}
				</li>
			))}
		</ol>
	);
}

export function Stat({ n, children, tag }: { n: string; children: ReactNode; tag?: ReactNode }) {
	return (
		<div>
			<span className="n">{n}</span>
			<b>{children}</b>
			{tag}
		</div>
	);
}

export function Err({ children }: { children: ReactNode }) {
	return children ? <p className="inline-err">{children}</p> : null;
}

export const errText = (e: unknown) => {
	const m = e instanceof Error ? e.message : String(e);
	if (/reject|denied|cancel/i.test(m) && !/cooldown|cancellation/i.test(m)) return 'You declined in the wallet. Nothing was sent.';
	return m;
};
