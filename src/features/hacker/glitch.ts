import { randomGlyph } from './fx-canvas';

const DECODE_MS = 550;
const BANNER_MS = 1800;

/**
 * "Decrypts" a title: an overlay with the same font is laid exactly over
 * `titleEl` and resolves from random glyphs to the real text, left to right.
 * The real element (often contenteditable, e.g. the inline title) is only
 * made transparent meanwhile, never edited.
 */
export function decodeTitle(titleEl: HTMLElement) {
	const text = titleEl.textContent ?? '';
	const rect = titleEl.getBoundingClientRect();
	if (!text.trim() || rect.width === 0 || rect.height === 0) return;

	const style = getComputedStyle(titleEl);
	const overlay = document.body.createDiv({ cls: 'crystal-hx-decode' });
	Object.assign(overlay.style, {
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${rect.width}px`,
		minHeight: `${rect.height}px`,
		font: style.font,
		letterSpacing: style.letterSpacing,
		lineHeight: style.lineHeight,
		textAlign: style.textAlign,
		padding: style.padding,
	});
	titleEl.addClass('crystal-hx-decoding');

	const chars = Array.from(text);
	const start = performance.now();
	const frame = (now: number) => {
		const progress = Math.min(1, (now - start) / DECODE_MS);
		const revealed = Math.floor(progress * chars.length);
		overlay.setText(chars.map((c, i) => (i < revealed || /\s/.test(c) ? c : randomGlyph())).join(''));
		if (progress < 1 && overlay.isConnected) {
			requestAnimationFrame(frame);
		} else {
			overlay.remove();
			titleEl.removeClass('crystal-hx-decoding');
		}
	};
	requestAnimationFrame(frame);
}

/**
 * Centered "ACCESS GRANTED"-style banner for big moments (level up, badge),
 * or a small terminal line in the corner for routine rewards.
 */
export function showRewardBanner(text: string, major: boolean) {
	const el = document.body.createDiv({ cls: major ? 'crystal-hx-banner' : 'crystal-hx-toast' });
	if (major) {
		el.createDiv({ cls: 'crystal-hx-banner-kicker', text: '// ACCESS GRANTED' });
		const main = el.createDiv({ cls: 'crystal-hx-banner-text', text });
		// Pseudo-elements draw the red/cyan split copies from this attribute.
		main.setAttr('data-text', text);
	} else {
		el.setText(`> ${text}`);
	}
	window.setTimeout(() => el.addClass('is-leaving'), major ? BANNER_MS : BANNER_MS / 2);
	window.setTimeout(() => el.remove(), (major ? BANNER_MS : BANNER_MS / 2) + 400);
}

/** Removes any banner/decode overlays still on screen (plugin unload / mode off). */
export function clearGlitchOverlays() {
	document.body.querySelectorAll('.crystal-hx-banner, .crystal-hx-toast, .crystal-hx-decode').forEach(el => el.remove());
	document.body.querySelectorAll('.crystal-hx-decoding').forEach(el => el.removeClass('crystal-hx-decoding'));
}
