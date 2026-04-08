import { PCloudService } from '../src/pcloud-service';
import { DEFAULT_SETTINGS } from '../src/settings';

// fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch;

// navigator.clipboard mock
const mockClipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
Object.defineProperty(global, 'navigator', {
	value: { clipboard: mockClipboard },
	writable: true,
});

function makeSettings(overrides: Record<string, unknown> = {}) {
	return {
		...DEFAULT_SETTINGS,
		pcloudUsername: 'test@example.com',
		pcloudPassword: 'testpassword',
		pcloudPublicFolderId: 'testPublicFolderHash',
		autoWebpPaste: false, // Node環境にImageがないためスキップ
		...overrides,
	};
}

function makeMockApp() {
	return {} as any;
}

beforeEach(() => {
	mockFetch.mockReset();
});

describe('PCloudService.uploadFile', () => {
	it('認証・フォルダ取得・アップロードが正常に完了する', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		// 1. userinfo (authenticate)
		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0, auth: 'token-abc' }),
		});
		// 2. listfolder
		mockFetch.mockResolvedValueOnce({
			json: async () => ({
				result: 0,
				metadata: {
					contents: [
						{ isfolder: true, name: 'Public Folder', folderid: 999 },
					],
				},
			}),
		});
		// 3. uploadfile
		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0, fileids: [1] }),
		});

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		const url = await service.uploadFile(file);

		expect(url).toContain('testPublicFolderHash');
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it('authenticate で getauth=1 を送る', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0, auth: 'token-abc' }),
		});
		mockFetch.mockResolvedValueOnce({
			json: async () => ({
				result: 0,
				metadata: { contents: [{ isfolder: true, name: 'Public Folder', folderid: 1 }] },
			}),
		});
		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0 }),
		});

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		await service.uploadFile(file);

		const [, authCallOptions] = mockFetch.mock.calls[0];
		const body = new URLSearchParams(authCallOptions.body);
		expect(body.get('getauth')).toBe('1');
	});

	it('listfolder と uploadfile で auth token を使う（パスワード不使用）', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0, auth: 'my-token' }),
		});
		mockFetch.mockResolvedValueOnce({
			json: async () => ({
				result: 0,
				metadata: { contents: [{ isfolder: true, name: 'Public Folder', folderid: 1 }] },
			}),
		});
		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0 }),
		});

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		await service.uploadFile(file);

		// listfolder call
		const listFolderBody = new URLSearchParams(mockFetch.mock.calls[1][1].body);
		expect(listFolderBody.get('auth')).toBe('my-token');
		expect(listFolderBody.get('password')).toBeNull();

		// uploadfile call (FormData)
		const uploadFormData: FormData = mockFetch.mock.calls[2][1].body;
		expect(uploadFormData.get('auth')).toBe('my-token');
		expect(uploadFormData.get('password')).toBeNull();
	});

	it('認証失敗時にエラーをスロー', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 2000, error: 'Please provide \'code\'.' }),
		});

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		await expect(service.uploadFile(file)).rejects.toThrow('Failed to authenticate with pCloud');
	});

	it('auth token が返らない場合にエラーをスロー', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0 }), // auth フィールドなし
		});

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		await expect(service.uploadFile(file)).rejects.toThrow('no auth token returned');
	});

	it('Public Folder が見つからない場合にエラーをスロー', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		mockFetch.mockResolvedValueOnce({
			json: async () => ({ result: 0, auth: 'token-abc' }),
		});
		mockFetch.mockResolvedValueOnce({
			json: async () => ({
				result: 0,
				metadata: { contents: [] }, // 空
			}),
		});

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		await expect(service.uploadFile(file)).rejects.toThrow('Public Folder not found');
	});

	it('pcloudPublicFolderId 未設定時にエラーをスロー', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings({ pcloudPublicFolderId: '' }));

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		await expect(service.uploadFile(file)).rejects.toThrow('pCloud Public Folder ID is not configured');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('画像以外のファイルはエラーをスロー', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
		await expect(service.uploadFile(file)).rejects.toThrow('Only image files are supported');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('auth token をキャッシュして2回目の認証リクエストを送らない', async () => {
		const service = new PCloudService(makeMockApp(), makeSettings());

		// 1回目
		mockFetch.mockResolvedValueOnce({ json: async () => ({ result: 0, auth: 'cached-token' }) });
		mockFetch.mockResolvedValueOnce({
			json: async () => ({
				result: 0,
				metadata: { contents: [{ isfolder: true, name: 'Public Folder', folderid: 1 }] },
			}),
		});
		mockFetch.mockResolvedValueOnce({ json: async () => ({ result: 0 }) });

		// 2回目
		mockFetch.mockResolvedValueOnce({
			json: async () => ({
				result: 0,
				metadata: { contents: [{ isfolder: true, name: 'Public Folder', folderid: 1 }] },
			}),
		});
		mockFetch.mockResolvedValueOnce({ json: async () => ({ result: 0 }) });

		const file = new File(['data'], 'test.png', { type: 'image/png' });
		await service.uploadFile(file);
		await service.uploadFile(file);

		// userinfo は1回だけ
		const userinfoCalls = mockFetch.mock.calls.filter(([url]) => url.includes('userinfo'));
		expect(userinfoCalls).toHaveLength(1);
	});
});
