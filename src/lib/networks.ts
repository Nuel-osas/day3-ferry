// The two Hashi deployments Ferry talks to. Every id is written down with how it was checked.
//
// Mainnet: package and Hashi object from Hashi's own docs (MystenLabs/hashi
// design/docs/reference/networks.mdx) and crates/hashi/src/constants.rs, read on 11 Nov 2026.
// `pnpm verify` also checks them against the chain: the object decodes as a Hashi object under that
// package, the hBTC supply equals the BTC Hashi holds, and its Bitcoin chain id is Bitcoin mainnet.
// The SDK (0.6.29) has no mainnet defaults yet, so Ferry passes these ids explicitly.
//
// Testnet: the SDK's own defaults (@mysten/hashi 0.6.29 constants), the same values as the docs table.
import type { BitcoinNetwork } from '@mysten/hashi';

export type NetworkId = 'mainnet' | 'testnet';

export type Network = {
	id: NetworkId;
	label: string;
	/** Wallet Standard chain id. */
	chain: `sui:${NetworkId}`;
	suiGrpc: string;
	graphql: string;
	hashiObjectId: string;
	packageId: string;
	bitcoinNetwork: BitcoinNetwork;
	bitcoinLabel: string;
	/** Esplora REST bases, tried in order. Both serve the same API. */
	esplora: string[];
	btcExplorer: string; // + /tx/<txid> or /address/<addr>
	suiExplorer: string; // + /tx/<digest> or /account/<addr>
	/** Real money. The UI says so before anything is signed. */
	real: boolean;
};

export const NETWORKS: Record<NetworkId, Network> = {
	mainnet: {
		id: 'mainnet',
		label: 'Mainnet',
		chain: 'sui:mainnet',
		suiGrpc: 'https://fullnode.mainnet.sui.io:443',
		graphql: 'https://graphql.mainnet.sui.io/graphql',
		hashiObjectId: '0x8d110642d9b5133bd661cda4873edf135ab6b91ff6918601015880874b950e5d',
		packageId: '0xd30fb3f8914efdbeb7b8e85fae1d65dc584b44a1281f66737b92bb9f03a59d06',
		bitcoinNetwork: 'mainnet',
		bitcoinLabel: 'Bitcoin',
		esplora: ['https://blockstream.info/api', 'https://mempool.space/api'],
		btcExplorer: 'https://mempool.space',
		suiExplorer: 'https://suiscan.xyz/mainnet',
		real: true,
	},
	testnet: {
		id: 'testnet',
		label: 'Testnet',
		chain: 'sui:testnet',
		suiGrpc: 'https://fullnode.testnet.sui.io:443',
		graphql: 'https://graphql.testnet.sui.io/graphql',
		hashiObjectId: '0x342e908043db6090558ed7766df95bfc3609881b2eac7edb5343dd5bb3ddd1bb',
		packageId: '0x5e0b99c31f691742acea5de4ca1bf53c398d5639fed6503a51ffe8035dc68485',
		bitcoinNetwork: 'signet',
		bitcoinLabel: 'Bitcoin Signet',
		esplora: ['https://blockstream.info/signet/api', 'https://mempool.space/signet/api'],
		btcExplorer: 'https://mempool.space/signet',
		suiExplorer: 'https://suiscan.xyz/testnet',
		real: false,
	},
};

export const hbtcType = (n: Network) => `${n.packageId}::btc::BTC`;
export const btcTxUrl = (n: Network, txid: string) => `${n.btcExplorer}/tx/${txid.replace(/^0x/, '')}`;
export const btcAddrUrl = (n: Network, addr: string) => `${n.btcExplorer}/address/${addr}`;
export const suiTxUrl = (n: Network, digest: string) => `${n.suiExplorer}/tx/${digest}`;
export const suiAddrUrl = (n: Network, addr: string) => `${n.suiExplorer}/account/${addr}`;
