import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import { QuartzService } from '../src/features/quartz/quartz-service';
import { CrystalPluginSettings, DEFAULT_SETTINGS } from '../src/settings';
import type { TerminalService } from '../src/shared/terminal-service';

type TerminalResult = { stdout: string; stderr: string; exitCode: number };

const mockNotice = Notice as unknown as { messages: string[] };

const setup = (overrides: Partial<CrystalPluginSettings>, result: TerminalResult = { stdout: '', stderr: '', exitCode: 0 }) => {
	const executeCommand = jest.fn<Promise<TerminalResult>, [string]>(async () => result);
	const terminal = { executeCommand } as unknown as TerminalService;
	const settings: CrystalPluginSettings = { ...DEFAULT_SETTINGS, ...overrides };
	const service = new QuartzService({ addCommand: jest.fn() } as unknown as Plugin, settings, terminal);
	return { service, executeCommand };
};

describe('QuartzService', () => {
	const openMock = jest.fn();

	beforeEach(() => {
		mockNotice.messages = [];
		(globalThis as any).open = openMock;
		jest.spyOn(console, 'log').mockImplementation(() => {});
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		delete (globalThis as any).open;
	});

	it('does not sync when the Quartz path is empty', async () => {
		const { service, executeCommand } = setup({ quartzPath: '  ' });
		expect(await service.quartzSync()).toBe(false);
		expect(executeCommand).not.toHaveBeenCalled();
		expect(mockNotice.messages[0]).toMatch(/^⚠️ Quartz path is not set/);
	});

	it('reports success only when the sync exits with 0', async () => {
		const { service, executeCommand } = setup({ quartzPath: '/q' });
		expect(await service.quartzSync()).toBe(true);
		expect(executeCommand).toHaveBeenCalledWith('cd "/q" && npx quartz sync');
		expect(mockNotice.messages).toEqual(['✅ Quartz Sync executed']);
	});

	it('shows an error when the sync exits with a non-zero code', async () => {
		const { service } = setup({ quartzPath: '/q' }, { stdout: '', stderr: 'boom', exitCode: 1 });
		expect(await service.quartzSync()).toBe(false);
		expect(mockNotice.messages).toEqual(['❌ Quartz sync failed (exit code 1)']);
	});

	it('does not open the site when the GitHub user name is empty', async () => {
		const { service } = setup({ githubUserName: '' });
		await service.openQuartzSite();
		expect(openMock).not.toHaveBeenCalled();
		expect(mockNotice.messages[0]).toMatch(/^⚠️ GitHub user name is not set/);
	});

	it('does not sync or open anything when the GitHub user name is empty', async () => {
		const { service, executeCommand } = setup({ quartzPath: '/q', githubUserName: '' });
		await service.quartzSyncAndOpenSite();
		expect(executeCommand).not.toHaveBeenCalled();
		expect(openMock).not.toHaveBeenCalled();
	});

	it('does not open pages when the sync fails', async () => {
		const { service } = setup({ quartzPath: '/q', githubUserName: 'me' }, { stdout: '', stderr: '', exitCode: 2 });
		await service.quartzSyncAndOpenSite();
		expect(openMock).not.toHaveBeenCalled();
	});

	it('opens the site and Actions page after a successful sync', async () => {
		const { service } = setup({ quartzPath: '/q', githubUserName: 'me' });
		await service.quartzSyncAndOpenSite();
		expect(openMock).toHaveBeenCalledWith('https://me.github.io');
		expect(openMock).toHaveBeenCalledWith('https://github.com/me/me.github.io/actions');
	});
});
