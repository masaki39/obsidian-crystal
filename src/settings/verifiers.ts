import { requestUrl } from 'obsidian';
import { AtpAgent } from '@atproto/api';

// "Verify" buttons: each throws with a user-facing message when the credential doesn't work.

export async function verifyGyazoToken(token: string): Promise<void> {
	if (!token) throw new Error('Access token is empty');
	const response = await requestUrl({
		url: `https://api.gyazo.com/api/images?access_token=${encodeURIComponent(token)}&per_page=1`,
		method: 'GET',
		throw: false,
	});
	if (response.status === 401) throw new Error('Invalid access token');
	if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
}

export async function verifyOpenAIKey(key: string): Promise<void> {
	if (!key) throw new Error('API key is empty');
	const response = await requestUrl({
		url: 'https://api.openai.com/v1/models',
		method: 'GET',
		headers: { 'Authorization': `Bearer ${key}` },
		throw: false,
	});
	if (response.status === 401) throw new Error('Invalid API key');
	if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
}

export async function verifyGeminiKey(key: string): Promise<void> {
	if (!key) throw new Error('API key is empty');
	const response = await requestUrl({
		url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
		method: 'GET',
		throw: false,
	});
	if (response.status === 400 || response.status === 401 || response.status === 403) throw new Error('Invalid API key');
	if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
}

export async function verifyOllama(baseUrl: string): Promise<void> {
	const url = (baseUrl || '').trim().replace(/\/+$/, '');
	if (!url) throw new Error('Base URL is empty');
	const response = await requestUrl({
		url: `${url}/api/tags`,
		method: 'GET',
		throw: false,
	});
	if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status} (is the Ollama server running?)`);
}

export async function verifyBlueskyCredentials(identifier: string, password: string): Promise<void> {
	if (!identifier || !password) throw new Error('Handle/email and app password are required');
	const agent = new AtpAgent({ service: 'https://bsky.social' });
	await agent.login({ identifier, password });
}
