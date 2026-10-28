import { EditorView, ViewUpdate } from '@codemirror/view';
import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import type { CrystalPluginSettings, HackerEffectToggles } from '../../settings';
import { DEFAULT_HACKER_EFFECTS } from '../../settings/defaults';
import { OverlayCanvas, prefersReducedMotion } from './fx-canvas';
import { MatrixRain } from './matrix';
import { TypingFx } from './typing';
import { BootSequence } from './boot';
import { HackerHud } from './hud';
import { GAMIFICATION_FLASH_EVENT } from '../../gamification';
import { clearGlitchOverlays, decodeTitle, showRewardBanner } from './glitch';

type PluginHost = Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

/** Flashes shown at least this long are the big moments (level up, badge, best). */
const MAJOR_FLASH_MS = 2200;

/**
 * "Hacker mode": purely cosmetic effects layered over the existing theme.
 * Everything is either a class on `body`, an overlay element the plugin owns,
 * or a reaction to editor/workspace events — Obsidian's own DOM is never
 * rewritten. `apply()` is idempotent and reconciles what's running with the
 * settings, so toggling anything at runtime (or unloading) leaves nothing behind.
 */
export class HackerModeService {
	private readonly typing: TypingFx;
	private readonly boot: BootSequence;
	private readonly hud: HackerHud;
	private crtEl: HTMLElement | null = null;
	private matrixCanvas: OverlayCanvas | null = null;
	private matrixRain: MatrixRain | null = null;
	/** Last file whose title was decoded in each leaf, so re-activating an
	 * already-open tab doesn't replay the effect. */
	private decodedFileByLeaf = new WeakMap<WorkspaceLeaf, string>();

	constructor(private readonly plugin: PluginHost) {
		const color = () => this.plugin.settings.hackerColor;
		this.typing = new TypingFx(color);
		this.boot = new BootSequence(plugin.app, plugin.manifest.version);
		this.hud = new HackerHud(plugin);
	}

	onload() {
		const { settings } = this.plugin;
		settings.hackerEffects = { ...DEFAULT_HACKER_EFFECTS, ...settings.hackerEffects };

		this.plugin.registerEditorExtension(EditorView.updateListener.of(update => this.onEditorUpdate(update)));
		this.plugin.registerEvent(this.plugin.app.workspace.on('file-open', file => this.onFileOpen(file)));
		this.plugin.registerEvent(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.plugin.app.workspace as any).on(GAMIFICATION_FLASH_EVENT, (text: string, duration: number) => {
				if (this.isOn('rewardBanner')) showRewardBanner(text, duration >= MAJOR_FLASH_MS);
			})
		);

		this.plugin.addCommand({
			id: 'crystal-hacker-mode-toggle',
			name: 'Hacker mode: Toggle',
			icon: 'terminal',
			callback: async () => {
				this.plugin.settings.hackerModeEnabled = !this.plugin.settings.hackerModeEnabled;
				await this.plugin.saveSettings();
				if (this.isOn('boot')) this.boot.play();
			},
		});
		this.plugin.addCommand({
			id: 'crystal-hacker-mode-boot',
			name: 'Hacker mode: Play boot sequence',
			callback: () => this.boot.play(),
		});
		this.plugin.addCommand({
			id: 'crystal-hacker-mode-test-banner',
			name: 'Hacker mode: Preview reward banner',
			callback: () => showRewardBanner('LEVEL UP Lv42', true),
		});

		this.plugin.app.workspace.onLayoutReady(() => {
			this.apply();
			if (this.isOn('boot')) this.boot.play();
		});
	}

	onunload() {
		this.stopAll();
	}

	updateSettings() {
		this.apply();
	}

	playBoot() {
		this.boot.play();
	}

	private isOn(effect: keyof HackerEffectToggles): boolean {
		const { settings } = this.plugin;
		return settings.hackerModeEnabled && !!settings.hackerEffects?.[effect];
	}

	/** Start/stop each effect so what's running matches the settings. */
	private apply() {
		const { settings } = this.plugin;
		const body = document.body;
		body.toggleClass('crystal-hacker', settings.hackerModeEnabled);
		body.toggleClass('crystal-hx-glow', this.isOn('glow'));
		if (settings.hackerModeEnabled) body.style.setProperty('--crystal-hx-color', settings.hackerColor);
		else body.style.removeProperty('--crystal-hx-color');

		if (this.isOn('crt') && !this.crtEl) this.crtEl = body.createDiv({ cls: 'crystal-hx-crt' });
		if (!this.isOn('crt')) this.removeCrt();

		if (this.isOn('typingParticles')) this.typing.start();
		else this.typing.stop();

		if (this.isOn('hud')) this.hud.start();
		else this.hud.stop();

		if (this.isOn('matrixBackground') && !prefersReducedMotion()) {
			if (!this.matrixCanvas) {
				this.matrixCanvas = new OverlayCanvas('crystal-hx-matrix-bg');
				this.matrixRain = new MatrixRain(this.matrixCanvas, () => this.plugin.settings.hackerColor, 10);
				this.matrixRain.start();
			}
			this.matrixCanvas.el.style.opacity = String(settings.hackerMatrixOpacity);
		} else {
			this.removeMatrix();
		}

		if (!settings.hackerModeEnabled) {
			this.boot.stop();
			clearGlitchOverlays();
		}
	}

	private stopAll() {
		document.body.removeClass('crystal-hacker', 'crystal-hx-glow');
		document.body.style.removeProperty('--crystal-hx-color');
		this.removeCrt();
		this.removeMatrix();
		this.typing.stop();
		this.hud.stop();
		this.boot.stop();
		clearGlitchOverlays();
	}

	private removeCrt() {
		this.crtEl?.remove();
		this.crtEl = null;
	}

	private removeMatrix() {
		this.matrixRain?.stop();
		this.matrixRain = null;
		this.matrixCanvas?.destroy();
		this.matrixCanvas = null;
	}

	private onEditorUpdate(update: ViewUpdate) {
		if (!this.plugin.settings.hackerModeEnabled || !update.docChanged) return;
		// Only real keystrokes (incl. IME composition) — not paste, undo or programmatic edits.
		const deleted = update.transactions.some(tr => tr.isUserEvent('delete'));
		const typed = update.transactions.some(tr => tr.isUserEvent('input.type'));
		if (!typed && !deleted) return;

		if (this.isOn('hud')) this.hud.recordKey();
		if (this.isOn('typingParticles')) {
			const view = update.view;
			const head = update.state.selection.main.head;
			// Layout can't be read during an update; let CodeMirror schedule it.
			view.requestMeasure({
				read: v => v.coordsAtPos(head),
				write: coords => {
					if (coords) this.typing.burst(coords.left, (coords.top + coords.bottom) / 2, deleted);
				},
			});
		}
	}

	private onFileOpen(file: TFile | null) {
		const leaf = this.plugin.app.workspace.getMostRecentLeaf();
		if (!file || !leaf) return;
		// `file-open` also fires when switching to a tab that already shows this file.
		const isNewlyOpened = this.decodedFileByLeaf.get(leaf) !== file.path;
		this.decodedFileByLeaf.set(leaf, file.path);
		if (!isNewlyOpened || !this.isOn('titleDecode') || this.boot.playing) return;
		// Let the view render the new title first.
		window.setTimeout(() => {
			const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) return;
			const inlineTitle = view.containerEl.querySelector<HTMLElement>('.inline-title');
			const titleEl = inlineTitle && inlineTitle.offsetParent !== null
				? inlineTitle
				: view.containerEl.querySelector<HTMLElement>('.view-header-title');
			if (titleEl) decodeTitle(titleEl);
		}, 60);
	}
}
