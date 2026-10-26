/** Glyphs used by the rain, scramble and particle effects. */
export const HACKER_GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF<>/{}[]#$%&*+=';

export function randomGlyph(): string {
	return HACKER_GLYPHS[Math.floor(Math.random() * HACKER_GLYPHS.length)];
}

/** Canvas `font` string using the theme's monospace font (canvas can't read CSS variables). */
export function monospaceFont(size: number): string {
	const family = getComputedStyle(document.body).getPropertyValue('--font-monospace').trim();
	return `${size}px ${family || 'monospace'}`;
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * A canvas covering the whole window (or `parent`) that never takes pointer
 * events, so effects can be drawn on top of the UI without blocking it.
 * Handles devicePixelRatio and window resizes; `destroy()` removes everything.
 */
export class OverlayCanvas {
	readonly el: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;
	width = 0;
	height = 0;
	private readonly onResize = () => this.resize();

	constructor(cls: string, parent: HTMLElement = document.body) {
		this.el = parent.createEl('canvas', { cls: ['crystal-hx-canvas', cls] });
		this.ctx = this.el.getContext('2d') as CanvasRenderingContext2D;
		this.resize();
		window.addEventListener('resize', this.onResize);
	}

	resize() {
		const dpr = window.devicePixelRatio || 1;
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.el.width = Math.floor(this.width * dpr);
		this.el.height = Math.floor(this.height * dpr);
		this.el.style.width = `${this.width}px`;
		this.el.style.height = `${this.height}px`;
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	clear() {
		this.ctx.clearRect(0, 0, this.width, this.height);
	}

	destroy() {
		window.removeEventListener('resize', this.onResize);
		this.el.remove();
	}
}

/**
 * requestAnimationFrame loop capped at `fps` that does no work while the
 * window is hidden. `tick` receives the elapsed seconds (clamped so a long
 * pause doesn't produce a huge jump) and may return `false` to stop the loop,
 * e.g. once every particle has died.
 */
export class FrameLoop {
	private rafId: number | null = null;
	private last = 0;

	constructor(private readonly tick: (dt: number) => boolean | void, private readonly fps = 30) {}

	get running(): boolean {
		return this.rafId !== null;
	}

	start() {
		if (this.rafId !== null) return;
		this.last = performance.now();
		this.rafId = requestAnimationFrame(this.frame);
	}

	stop() {
		if (this.rafId !== null) cancelAnimationFrame(this.rafId);
		this.rafId = null;
	}

	private readonly frame = (now: number) => {
		this.rafId = requestAnimationFrame(this.frame);
		if (document.hidden) {
			this.last = now;
			return;
		}
		const elapsed = now - this.last;
		if (elapsed < 1000 / this.fps - 1) return;
		this.last = now;
		if (this.tick(Math.min(elapsed, 100) / 1000) === false) this.stop();
	};
}
