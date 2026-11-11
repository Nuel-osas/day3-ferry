// The user's own Sui wallet (Slush, Suiet, ...), found over Wallet Standard. Hashi needs nothing
// else on the Sui side: the Bitcoin side is any Bitcoin wallet the user already has.
import { getWallets, type Wallet, type WalletAccount } from '@mysten/wallet-standard';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Connected = { wallet: Wallet; account: WalletAccount; address: string };

type Ctx = {
	wallets: readonly Wallet[];
	connected: Connected | null;
	connect: (w: Wallet) => Promise<void>;
	disconnect: () => void;
};

const WalletCtx = createContext<Ctx | null>(null);
export const useWallet = () => useContext(WalletCtx)!;

type ConnectFeature = { connect: () => Promise<{ accounts: readonly WalletAccount[] }> };
type EventsFeature = { on: (e: 'change', f: (p: { accounts?: readonly WalletAccount[] }) => void) => () => void };

export function WalletProvider({ children }: { children: ReactNode }) {
	const [wallets, setWallets] = useState<readonly Wallet[]>([]);
	const [connected, setConnected] = useState<Connected | null>(null);

	useEffect(() => {
		const api = getWallets();
		const sync = () => setWallets(api.get().filter((w) => w.chains.some((c) => c.startsWith('sui:'))));
		sync();
		const offs = [api.on('register', sync), api.on('unregister', sync)];
		return () => offs.forEach((off) => off());
	}, []);

	const connect = useCallback(async (w: Wallet) => {
		const f = w.features['standard:connect'] as ConnectFeature | undefined;
		if (!f) throw new Error(`${w.name} cannot connect`);
		const { accounts } = await f.connect();
		const account = accounts.find((a) => a.chains.some((c) => c.startsWith('sui:'))) ?? accounts[0];
		if (!account) throw new Error(`${w.name} returned no account`);
		setConnected({ wallet: w, account, address: account.address });
	}, []);

	const disconnect = useCallback(() => {
		const f = connected?.wallet.features['standard:disconnect'] as { disconnect?: () => Promise<void> } | undefined;
		f?.disconnect?.().catch(() => {});
		setConnected(null);
	}, [connected]);

	// Follow the wallet when the user switches accounts in it.
	useEffect(() => {
		const ev = connected?.wallet.features['standard:events'] as EventsFeature | undefined;
		if (!ev) return;
		return ev.on('change', ({ accounts }) => {
			const a = accounts?.[0];
			setConnected((prev) => (prev && a ? { ...prev, account: a, address: a.address } : a ? prev : null));
		});
	}, [connected?.wallet]);

	return <WalletCtx.Provider value={{ wallets, connected, connect, disconnect }}>{children}</WalletCtx.Provider>;
}
