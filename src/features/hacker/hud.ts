import type { Plugin } from 'obsidian';

const SPARK = '▁▂▃▄▅▆▇█';
const WPM_WINDOW_MS = 60_000;
const SAMPLE_EVERY_S = 5;
const SAMPLE_COUNT = 12;

/**
 * Status-bar readout: clock, JS heap, and typing speed with a sparkline.
 * WPM is chars typed in the last minute / 5, fed by `recordKey()`.
 */
export class HackerHud {
	private el: HTMLElement | null = null;
	private intervalId: number | null = null;
	private keyTimes: number[] = [];
	private samples: number[] = [];
	private ticks = 0;

	constructor(private readonly plugin: Plugin) {}

	start() {
		if (this.el) return;
		this.el = this.plugin.addStatusBarItem();
		this.el.addClass('crystal-hx-hud');
		this.render();
		this.intervalId = window.setInterval(() => this.render(), 1000);
	}

	stop() {
		if (this.intervalId !== null) window.clearInterval(this.intervalId);
		this.intervalId = null;
		this.el?.remove();
		this.el = null;
	}

	recordKey() {
		this.keyTimes.push(Date.now());
	}

	private wpm(): number {
		const cutoff = Date.now() - WPM_WINDOW_MS;
		while (this.keyTimes.length > 0 && this.keyTimes[0] < cutoff) this.keyTimes.shift();
		return Math.round(this.keyTimes.length / 5);
	}

	private render() {
		if (!this.el) return;
		const wpm = this.wpm();
		if (this.ticks++ % SAMPLE_EVERY_S === 0) {
			this.samples.push(wpm);
			if (this.samples.length > SAMPLE_COUNT) this.samples.shift();
		}
		const max = Math.max(1, ...this.samples);
		const spark = this.samples.map(v => SPARK[Math.min(SPARK.length - 1, Math.floor((v / max) * (SPARK.length - 1)))]).join('');

		// Chromium-only, non-standard; the segment is simply omitted elsewhere.
		const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
		const time = new Date().toLocaleTimeString([], { hour12: false });

		this.el.empty();
		this.el.createSpan({ cls: 'crystal-hx-hud-seg', text: `⏻ ${time}` });
		if (heap) this.el.createSpan({ cls: 'crystal-hx-hud-seg', text: `HEAP ${Math.round(heap / 1024 / 1024)}M` });
		this.el.createSpan({ cls: 'crystal-hx-hud-seg', text: `${wpm} WPM` });
		this.el.createSpan({ cls: 'crystal-hx-hud-spark', text: spark });
	}
}
