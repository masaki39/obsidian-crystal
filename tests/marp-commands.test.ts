import { MarpCommands } from '../src/marp';
import { CrystalPluginSettings, DEFAULT_SETTINGS } from '../src/settings';
import type { Editor, MarkdownView, Plugin } from 'obsidian';

type TerminalResult = { stdout: string; stderr: string; exitCode: number };

class MockTerminalService {
	executeCommand = jest.fn<Promise<TerminalResult>, [string]>(async () => ({
		stdout: '',
		stderr: '',
		exitCode: 0
	}));
}

const createMockPlugin = (): Plugin =>
	({
		addCommand: jest.fn(),
		app: {
			vault: {
				adapter: { basePath: '' },
				getAbstractFileByPath: () => null,
				getFiles: () => [],
				read: async () => '',
				modify: async () => {}
			},
			fileManager: { renameFile: async () => {} },
			workspace: {
				getLeaf: () => ({
					setViewState: async () => {}
				})
			}
		}
	} as unknown as Plugin);

const createCommands = (overrides?: Partial<CrystalPluginSettings>) => {
	const settings: CrystalPluginSettings = {
		...DEFAULT_SETTINGS,
		...overrides
	};

	const terminal = new MockTerminalService();
	const plugin = createMockPlugin();
	const marpCommands = new MarpCommands(terminal as any, settings, plugin as any);

	return { marpCommands, terminal };
};

describe('MarpCommands theme handling', () => {
	it('returns empty theme option when no directory is configured', () => {
		const { marpCommands } = createCommands({ marpThemePath: '' });
		const option = (marpCommands as any).getThemeSetOption();
		expect(option).toBe('');
	});

	it('normalizes configured theme directory before building option', () => {
		const { marpCommands } = createCommands({ marpThemePath: 'Slides\\themes  ' });
		const option = (marpCommands as any).getThemeSetOption();
		expect(option).toBe(' --theme-set "Slides/themes"');
	});

	it('inserts option separator when building preview command', async () => {
		const { marpCommands, terminal } = createCommands({ marpThemePath: 'Slides/themes' });

		const mockFile = {
			path: 'Slides/example.md',
			parent: { path: 'Slides' },
			basename: 'example'
		};

		const view = { file: mockFile } as MarkdownView;

		await marpCommands.executeMarpPreviewCommand({} as Editor, view);

		expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
		expect(terminal.executeCommand).toHaveBeenCalledWith(
			'marp -p --theme-set "Slides/themes" -o "Slides/marp-preview.html" -- "Slides/example.md"'
		);
	});
});
