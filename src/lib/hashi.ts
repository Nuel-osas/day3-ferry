// One Sui client per network, extended with the Hashi SDK. Every Hashi call lives under
// `client.hashi.*`: tx (unsigned PTBs), call (Move-call thunks), view (reads), waitFor*, guardian.
import { hashi } from '@mysten/hashi';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Network, NetworkId } from './networks';

const make = (n: Network) =>
	new SuiGrpcClient({ network: n.id, baseUrl: n.suiGrpc }).$extend(
		// Mainnet ids are passed explicitly: SDK 0.6.29 throws on mainnet without them.
		hashi({ hashiObjectId: n.hashiObjectId, packageId: n.packageId, bitcoinNetwork: n.bitcoinNetwork, graphqlUrl: n.graphql }),
	);

export type HashiSui = ReturnType<typeof make>;

const cache = new Map<NetworkId, HashiSui>();
export function clientFor(n: Network): HashiSui {
	let c = cache.get(n.id);
	if (!c) cache.set(n.id, (c = make(n)));
	return c;
}
