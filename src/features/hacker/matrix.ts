import { FrameLoop, OverlayCanvas, monospaceFont, randomGlyph } from './fx-canvas';

const FONT_SIZE = 16;

/**
 * "Digital rain" drawn onto an `OverlayCanvas`. Trails fade with
 * `destination-out`, so it works both on a transparent overlay (the UI stays
 * visible underneath) and on an opaque background.
 */
export class MatrixRain {
	private loop: FrameLoop;
	private drops: number[] = [];
	private columns = 0;
	private stepTimer = 0;
	private font = '';

	constructor(
		private readonly canvas: OverlayCanvas,
		private readonly getColor: () => string,
		/** Rows each column advances per second. */
		private readonly rowsPerSecond = 18,
	) {
		this.loop = new FrameLoop(dt => this.tick(dt));
	}

	start() {
		this.font = monospaceFont(FONT_SIZE);
		this.loop.start();
	}

	stop() {
		this.loop.stop();
		this.canvas.clear();
	}

	private reset() {
		this.columns = Math.ceil(this.canvas.width / FONT_SIZE);
		const rows = this.canvas.height / FONT_SIZE;
		this.drops = Array.from({ length: this.columns }, () => -Math.random() * rows);
	}

	private tick(dt: number) {
		if (Math.ceil(this.canvas.width / FONT_SIZE) !== this.columns) this.reset();

		this.stepTimer += dt;
		const stepInterval = 1 / this.rowsPerSecond;
		if (this.stepTimer < stepInterval) return;
		this.stepTimer %= stepInterval;

		const { ctx, width, height } = this.canvas;
		ctx.globalCompositeOperation = 'destination-out';
		ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
		ctx.fillRect(0, 0, width, height);
		ctx.globalCompositeOperation = 'source-over';

		ctx.font = this.font;
		ctx.textBaseline = 'top';
		const color = this.getColor();
		for (let i = 0; i < this.drops.length; i++) {
			const y = this.drops[i] * FONT_SIZE;
			if (y >= 0) {
				// Bright head, accent-colored body left behind as it moves on.
				ctx.fillStyle = Math.random() < 0.1 ? '#ffffff' : color;
				ctx.fillText(randomGlyph(), i * FONT_SIZE, y);
			}
			this.drops[i] += 1;
			if (y > height && Math.random() > 0.975) this.drops[i] = 0;
		}
	}
}
