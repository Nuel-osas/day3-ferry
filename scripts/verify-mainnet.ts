// Checks Ferry's assumptions against Hashi on Sui mainnet and Bitcoin mainnet, without moving money.
//
//   1. Bitcoin chain: the Esplora server we read is the chain Hashi watches (genesis hash = bitcoin_chain_id).
//   2. Addresses: every BTC output Hashi holds paid the address the SDK derives from its Sui owner.
//   3. Reserve: the BTC in Hashi's active UTXO pool equals the hBTC supply, to the satoshi.
//   4. Deposit PTB: re-recording a UTXO Hashi already holds aborts on chain (simulated).
//   5. Withdrawal PTB: a real hBTC holder's request_withdrawal succeeds (simulated, never executed).
//
// Usage: pnpm verify
import { hashi } from '@mysten/hashi';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { bitcoinAddressToWitnessProgram } from '@mysten/hashi';
import { NETWORKS } from '../src/lib/networks';
import { activeUtxos, hbtcSupply } from '../src/lib/protocol';
import { esplora, reverseHex } from '../src/lib/bitcoin';

const net = NETWORKS.mainnet;
const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: net.suiGrpc }).$extend(
	hashi({ hashiObjectId: net.hashiObjectId, packageId: net.packageId, bitcoinNetwork: net.bitcoinNetwork, graphqlUrl: net.graphql }),
);
let failed = 0;
const check = (ok: boolean, label: string, detail = '') => {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
	if (!ok) failed++;
};

// 1. Bitcoin chain
const snap = await client.hashi.view.all();
const genesis = await esplora<string>(net, '/block-height/0', 'text');
check(genesis === reverseHex(snap.bitcoinChainId), 'Esplora serves the Bitcoin chain Hashi watches', genesis.slice(0, 16));

// 2 and 3. Addresses and reserve
const utxos = await activeUtxos(net);
let held = 0n;
let matched = 0;
let withPath = 0;
for (const u of utxos) {
	held += u.amountSats;
	if (!u.derivationPath) continue; // Hashi's own change output
	withPath++;
	const tx = await esplora<{ vout: { scriptpubkey_address?: string; value: number }[] }>(net, `/tx/${u.btcTxid}`);
	const paid = tx.vout[u.vout]?.scriptpubkey_address;
	const derived = await client.hashi.generateDepositAddress({ suiAddress: u.derivationPath });
	if (paid === derived && BigInt(tx.vout[u.vout].value) === u.amountSats) matched++;
	else console.log('      mismatch', u.btcTxid, u.vout, paid, derived);
}
check(withPath > 0 && matched === withPath, 'Every deposit Hashi holds paid the address the SDK derives', `${matched}/${withPath}`);
const supply = await hbtcSupply(net);
check(supply !== null && supply === held, 'BTC held equals hBTC supply', `${held} sats held, ${supply} hBTC sats minted`);

// 4. Re-recording a held UTXO aborts
const used = utxos.find((u) => u.derivationPath)!;
const sender = used.derivationPath!;
const dep = client.hashi.tx.deposit({ txid: `0x${used.btcTxid}`, utxos: [{ vout: used.vout, amountSats: used.amountSats }], recipient: sender });
dep.setSender(sender);
const depSim = await client.core.simulateTransaction({ transaction: dep, include: { effects: true } });
// A transaction that aborts comes back as FailedTransaction, with the Move error in its effects.
const depStatus = (depSim.Transaction ?? depSim.FailedTransaction)?.effects?.status;
const abort = depStatus && !depStatus.success ? depStatus.error.message ?? '' : '';
check(/EUtxoAlreadyUsed/.test(abort), 'Recording a UTXO Hashi already holds aborts', abort.slice(0, 90));

// 5. A holder's withdrawal request succeeds in simulation
const holders = [...new Set(utxos.map((u) => u.derivationPath).filter(Boolean) as string[])];
let simulated = false;
for (const h of holders) {
	const bal = await client.hashi.view.balance(h).catch(() => null);
	if (!bal || bal.totalBalance < snap.bitcoinWithdrawalMinimum) continue;
	const program = bitcoinAddressToWitnessProgram('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'mainnet').program;
	const w = client.hashi.tx.requestWithdrawal({ amount: snap.bitcoinWithdrawalMinimum, bitcoinAddress: program });
	w.setSender(h);
	const sim = await client.core.simulateTransaction({ transaction: w, include: { effects: true, events: true } }).catch((e) => ({ error: String(e) }));
	if ('error' in sim) { console.log('      simulate failed for', h, sim.error.slice(0, 160)); continue; }
	const ok = sim.Transaction?.effects?.status.success === true;
	const evt = sim.Transaction?.events?.find((e) => e.eventType.endsWith('::withdrawal_queue::WithdrawalRequested'));
	check(ok && !!evt, 'A holder can request a withdrawal (simulated, nothing executed)', `${h.slice(0, 10)}... balance ${bal.totalBalance} sats`);
	simulated = true;
	break;
}
if (!simulated) check(false, 'Found an hBTC holder to simulate a withdrawal with');

console.log(failed ? `\n${failed} check(s) failed` : '\nAll mainnet checks passed');
process.exit(failed ? 1 : 0);
