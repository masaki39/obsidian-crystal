/** XRPC error codes that mean the session was rejected, not the post itself. */
const AUTH_ERROR_CODES = new Set([
	'ExpiredToken',
	'InvalidToken',
	'AuthMissing',
	'AuthRequired',
	'AuthenticationRequired',
]);

export function isAuthError(error: unknown): boolean {
	const e = error as { status?: number; error?: string } | null;
	if (!e || typeof e !== 'object') return false;
	if (typeof e.error === 'string' && AUTH_ERROR_CODES.has(e.error)) return true;
	return e.status === 401;
}

/** Surface the HTTP status and XRPC error code, not just the bare message. */
export function formatXrpcError(error: unknown): string {
	const e = error as { status?: number; error?: string; message?: string } | null;
	if (!e || typeof e !== 'object') return String(error);
	const parts: string[] = [];
	if (typeof e.status === 'number') parts.push(`HTTP ${e.status}`);
	if (typeof e.error === 'string' && e.error) parts.push(e.error);
	const detail = parts.length > 0 ? ` (${parts.join(' ')})` : '';
	return `${e.message || String(error)}${detail}`;
}
