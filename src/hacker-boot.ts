import { App, apiVersion } from 'obsidian';

const LINE_INTERVAL_MS = 70;
const HOLD_MS = 700;
const FADE_MS = 400;

/**
 * Fake terminal boot log shown full-screen for ~2 seconds, built from real
 * vault facts so it doesn't feel canned. Any key or click skips it.
 */
export class BootSequence {
	private el: HTMLElement | null = null;
	private timers: number[] = [];
	private readonly onSkip = (e: Event) => {
		e.preventDefault();
		e.stopPropagation();
		this.finish();
	};

	constructor(private readonly app: App, private readonly pluginVersion: string) {}

	get playing(): boolean {
		return this.el !== null;
	}

	play() {
		if (this.el) return;
		this.el = document.body.createDiv({ cls: 'crystal-hx-boot' });
		const logEl = this.el.createDiv({ cls: 'crystal-hx-boot-log' });
		window.addEventListener('keydown', this.onSkip, true);
		window.addEventListener('mousedown', this.onSkip, true);

		const lines = this.buildLines();
		lines.forEach((line, i) => {
			this.later(() => {
				const lineEl = logEl.createDiv({ cls: 'crystal-hx-boot-line' });
				lineEl.createSpan({ cls: 'crystal-hx-boot-text', text: line.text });
				if (line.status) lineEl.createSpan({ cls: `crystal-hx-boot-status is-${line.status.toLowerCase()}`, text: `[ ${line.status} ]` });
			}, i * LINE_INTERVAL_MS);
		});

		const grantedAt = lines.length * LINE_INTERVAL_MS + 150;
		this.later(() => this.el?.createDiv({ cls: 'crystal-hx-boot-granted', text: 'ACCESS GRANTED' }), grantedAt);
		this.later(() => this.finish(), grantedAt + HOLD_MS);
	}

	stop() {
		this.timers.forEach(id => window.clearTimeout(id));
		this.timers = [];
		window.removeEventListener('keydown', this.onSkip, true);
		window.removeEventListener('mousedown', this.onSkip, true);
		this.el?.remove();
		this.el = null;
	}

	private finish() {
		const el = this.el;
		if (!el) return;
		window.removeEventListener('keydown', this.onSkip, true);
		window.removeEventListener('mousedown', this.onSkip, true);
		el.addClass('is-leaving');
		this.later(() => this.stop(), FADE_MS);
	}

	private later(fn: () => void, ms: number) {
		this.timers.push(window.setTimeout(fn, ms));
	}

	private buildLines(): Array<{ text: string; status?: 'OK' | 'WARN' }> {
		const files = this.app.vault.getMarkdownFiles();
		const totalBytes = files.reduce((sum, f) => sum + f.stat.size, 0);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const enabledPlugins: Set<string> | undefined = (this.app as any).plugins?.enabledPlugins;
		const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');

		return [
			{ text: `CRYSTAL BIOS v${this.pluginVersion} — obsidian api ${apiVersion}` },
			{ text: `memcheck 0x${hex()}..0x${hex()}`, status: 'OK' },
			{ text: `mount /vault/${this.app.vault.getName()}`, status: 'OK' },
			{ text: `index ${files.length} notes (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`, status: 'OK' },
			{ text: `load modules: ${enabledPlugins?.size ?? '?'} plugins`, status: 'OK' },
			{ text: 'init neural link', status: 'OK' },
			{ text: 'decrypt session key', status: 'OK' },
			{ text: 'bypass firewall', status: 'WARN' },
			{ text: `establish uplink @ ${new Date().toISOString()}`, status: 'OK' },
		];
	}
}
