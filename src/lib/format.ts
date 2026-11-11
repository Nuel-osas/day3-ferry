// Money stays in satoshis (bigint) end to end. These only format for display or parse user input.
export const SATS_PER_BTC = 100_000_000n;

/** 30000n -> "0.0003". Trailing zeros dropped, never rounded. */
export function btc(sats: bigint | null | undefined): string {
	if (sats == null) return 'unknown';
	const neg = sats < 0n;
	const v = neg ? -sats : sats;
	const whole = v / SATS_PER_BTC;
	const frac = (v % SATS_PER_BTC).toString().padStart(8, '0').replace(/0+$/, '');
	return `${neg ? '-' : ''}${whole.toLocaleString('en-US')}${frac ? `.${frac}` : ''}`;
}

export const sats = (v: bigint | null | undefined) => (v == null ? 'unknown' : `${v.toLocaleString('en-US')} sats`);

/** "0.0003" -> 30000n. Null for anything that is not a plain amount with at most 8 decimals. */
export function parseBtc(input: string): bigint | null {
	const s = input.trim();
	if (!/^\d+(\.\d{0,8})?$/.test(s)) return null;
	const [w, f = ''] = s.split('.');
	return BigInt(w) * SATS_PER_BTC + BigInt(f.padEnd(8, '0'));
}

export function duration(ms: number): string {
	if (ms <= 0) return 'now';
	const s = Math.ceil(ms / 1000);
	if (s < 60) return `${s} s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m} min${s % 60 && m < 10 ? ` ${s % 60} s` : ''}`;
	const h = Math.floor(m / 60);
	if (h >= 48) return `${Math.floor(h / 24)} days`;
	return `${h} h${m % 60 ? ` ${m % 60} min` : ''}`;
}

export const ago = (ms: number) => `${duration(Date.now() - ms)} ago`;
export const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const short = (s: string, a = 6, b = 4) => (s.length > a + b + 3 ? `${s.slice(0, a)}...${s.slice(-b)}` : s);
