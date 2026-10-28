import { FrameLoop, OverlayCanvas, monospaceFont } from './fx-canvas';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	glyph: string;
	color: string;
}

const MAX_PARTICLES = 60;
const GRAVITY = 250;
/** Peak opacity of a particle; kept low so it reads as a hint, not a burst. */
const PARTICLE_ALPHA = 0.55;
/** Keystrokes further apart than this reset the combo. */
const COMBO_TIMEOUT_MS = 1500;
/** Combo from which the counter turns "hot". */
const HOT_COMBO = 20;
const DELETE_COLOR = '#ff3b5c';

/**
 * Subtle "power mode" for the editor: a couple of faint 0/1 glyphs drifting
 * up from the caret on each keystroke, plus a combo counter. Draws on its own
 * overlay canvas and never touches the editor DOM.
 */
export class TypingFx {
	private canvas: OverlayCanvas | null = null;
	private loop: FrameLoop | null = null;
	private particles: Particle[] = [];
	private font = '';
	private comboEl: HTMLElement | null = null;
	private comboCountEl: HTMLElement | null = null;
	private combo = 0;
	private lastKeyAt = 0;
	private comboHideTimer: number | null = null;

	constructor(private readonly getColor: () => string) {}

	start() {
		if (this.canvas) return;
		this.canvas = new OverlayCanvas('crystal-hx-typing-canvas');
		this.loop = new FrameLoop(dt => this.tick(dt), 60);
		this.font = monospaceFont(9);
		this.comboEl = document.body.createDiv({ cls: 'crystal-hx-combo' });
		this.comboEl.createDiv({ cls: 'crystal-hx-combo-label', text: 'COMBO' });
		this.comboCountEl = this.comboEl.createDiv({ cls: 'crystal-hx-combo-count' });
	}

	stop() {
		this.loop?.stop();
		this.loop = null;
		this.canvas?.destroy();
		this.canvas = null;
		this.comboEl?.remove();
		this.comboEl = null;
		this.comboCountEl = null;
		if (this.comboHideTimer !== null) window.clearTimeout(this.comboHideTimer);
		this.comboHideTimer = null;
		this.particles = [];
		this.combo = 0;
	}

	/** Called for each user keystroke with the caret's screen position. */
	burst(x: number, y: number, isDelete: boolean) {
		if (!this.canvas || !this.loop) return;

		const now = Date.now();
		this.combo = now - this.lastKeyAt < COMBO_TIMEOUT_MS ? this.combo + 1 : 1;
		this.lastKeyAt = now;
		this.updateCombo();

		const color = isDelete ? DELETE_COLOR : this.getColor();
		const count = isDelete ? 1 : 2;
		for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
			const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
			const speed = 30 + Math.random() * 40;
			const maxLife = 0.3 + Math.random() * 0.2;
			this.particles.push({
				x, y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: maxLife,
				maxLife,
				glyph: Math.random() < 0.5 ? '0' : '1',
				color,
			});
		}
		this.loop.start();
	}

	private updateCombo() {
		if (!this.comboEl || !this.comboCountEl) return;
		if (this.combo < 5) return;
		this.comboCountEl.setText(String(this.combo));
		this.comboEl.addClass('is-visible');
		this.comboEl.toggleClass('is-hot', this.combo >= HOT_COMBO);
		// Restart the pop animation on every hit.
		this.comboCountEl.removeClass('is-pop');
		void this.comboCountEl.offsetWidth;
		this.comboCountEl.addClass('is-pop');

		if (this.comboHideTimer !== null) window.clearTimeout(this.comboHideTimer);
		this.comboHideTimer = window.setTimeout(() => {
			this.comboEl?.removeClass('is-visible');
			this.comboHideTimer = null;
		}, COMBO_TIMEOUT_MS);
	}

	private tick(dt: number): boolean {
		if (!this.canvas) return false;
		const { ctx } = this.canvas;
		this.canvas.clear();
		ctx.font = this.font;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		this.particles = this.particles.filter(p => {
			p.life -= dt;
			if (p.life <= 0) return false;
			p.vy += GRAVITY * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			ctx.globalAlpha = PARTICLE_ALPHA * (p.life / p.maxLife);
			ctx.fillStyle = p.color;
			ctx.fillText(p.glyph, p.x, p.y);
			return true;
		});
		ctx.globalAlpha = 1;

		// Idle the loop once nothing is left to draw.
		return this.particles.length > 0;
	}
}
