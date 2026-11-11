// The three things a user can do with Hashi, as unsigned PTBs. Two come straight from the SDK's
// `tx.*` builders; cancel is our own PTB around the SDK's `call.*` thunk.
import { bitcoinAddressToWitnessProgram } from '@mysten/hashi';
import { Transaction } from '@mysten/sui/transactions';
import type { Payment } from './bitcoin';
import type { HashiSui } from './hashi';
import { hbtcType, type Network } from './networks';

/**
 * Record a Bitcoin payment so the committee checks it. One PTB per funding transaction, three Move
 * calls per output: utxo::utxo_id(txid, vout) -> utxo::utxo(id, amount, recipient) -> deposit::deposit.
 * Anyone can send this transaction; the hBTC goes to `recipient`, the Sui address that derived the
 * deposit address, whoever pays the gas.
 */
export function recordTx(c: HashiSui, outputs: Payment[], recipient: string): Transaction {
	if (!outputs.length || outputs.some((o) => o.txid !== outputs[0].txid)) throw new Error('One funding transaction per record');
	return c.hashi.tx.deposit({
		txid: `0x${outputs[0].txid}`, // display order, as explorers show it; the SDK reverses it
		utxos: outputs.map((o) => ({ vout: o.vout, amountSats: o.amountSats })),
		recipient,
	});
}

/** The witness program Hashi stores for a Bitcoin address. Throws InvalidBitcoinAddressError. */
export const witnessProgram = (n: Network, address: string) => bitcoinAddressToWitnessProgram(address.trim(), n.bitcoinNetwork).program;

/**
 * Lock hBTC and ask for BTC: `tx.balance` takes exactly `amount` from the sender's hBTC (address
 * balance or coins), then withdraw::request_withdrawal(hashi, clock, balance, witness_program).
 */
export function withdrawTx(c: HashiSui, n: Network, amountSats: bigint, btcAddress: string): Transaction {
	return c.hashi.tx.requestWithdrawal({ amount: amountSats, bitcoinAddress: witnessProgram(n, btcAddress) });
}

/**
 * Cancel a request that is not yet in a Bitcoin batch. withdraw::cancel_withdrawal returns the locked
 * Balance<BTC>; we send it back to the sender's address balance, where hBTC is minted, rather than
 * making a new Coin object as the SDK's tx.cancelWithdrawal does.
 */
export function cancelTx(c: HashiSui, n: Network, requestId: string, owner: string): Transaction {
	const tx = new Transaction();
	const refund = tx.add(c.hashi.call.cancelWithdrawal({ requestId }));
	tx.moveCall({ target: '0x2::balance::send_funds', typeArguments: [hbtcType(n)], arguments: [refund, tx.pure.address(owner)] });
	return tx;
}

export const PTB = {
	record: 'utxo::utxo_id(txid, vout) -> utxo::utxo(id, amount, recipient) -> deposit::deposit(hashi, utxo, clock)',
	withdraw: 'tx.balance<hBTC>(amount) -> withdraw::request_withdrawal(hashi, clock, balance, witness_program)',
	cancel: 'withdraw::cancel_withdrawal(hashi, request_id, clock) -> balance::send_funds<hBTC>(refund, you)',
};
