import type { App, Plugin } from 'obsidian';
import type { CrystalPluginSettings, PropertyColorRule } from './settings';

export const PROPERTY_COLOR_STYLE_ID = 'crystal-property-colors';

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Escape a property name for use inside a double-quoted CSS string. */
function cssString(value: string): string {
	return value.replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, ' ');
}

export interface PaletteColor {
	name: string;
	/** Lowercase hex color. */
	color: string;
}

export interface ColorPalette {
	id: string;
	label: string;
	colors: PaletteColor[];
}

/** Preset swatches offered next to the free color picker in the settings. */
export const COLOR_PALETTES: ColorPalette[] = [
	{
		id: 'tokyo-night',
		label: 'Tokyo Night',
		colors: [
			{ name: 'Red', color: '#f7768e' },
			{ name: 'Orange', color: '#ff9e64' },
			{ name: 'Yellow', color: '#e0af68' },
			{ name: 'Green', color: '#9ece6a' },
			{ name: 'Teal', color: '#73daca' },
			{ name: 'Cyan', color: '#7dcfff' },
			{ name: 'Blue', color: '#7aa2f7' },
			{ name: 'Purple', color: '#bb9af7' },
		],
	},
	{
		id: 'catppuccin-mocha',
		label: 'Catppuccin Mocha',
		colors: [
			{ name: 'Red', color: '#f38ba8' },
			{ name: 'Peach', color: '#fab387' },
			{ name: 'Yellow', color: '#f9e2af' },
			{ name: 'Green', color: '#a6e3a1' },
			{ name: 'Teal', color: '#94e2d5' },
			{ name: 'Sky', color: '#89dceb' },
			{ name: 'Blue', color: '#89b4fa' },
			{ name: 'Mauve', color: '#cba6f7' },
		],
	},
	{
		id: 'nord',
		label: 'Nord',
		colors: [
			{ name: 'Red', color: '#bf616a' },
			{ name: 'Orange', color: '#d08770' },
			{ name: 'Yellow', color: '#ebcb8b' },
			{ name: 'Green', color: '#a3be8c' },
			{ name: 'Teal', color: '#8fbcbb' },
			{ name: 'Cyan', color: '#88c0d0' },
			{ name: 'Blue', color: '#81a1c1' },
			{ name: 'Purple', color: '#b48ead' },
		],
	},
	{
		id: 'dracula',
		label: 'Dracula',
		colors: [
			{ name: 'Red', color: '#ff5555' },
			{ name: 'Orange', color: '#ffb86c' },
			{ name: 'Yellow', color: '#f1fa8c' },
			{ name: 'Green', color: '#50fa7b' },
			{ name: 'Cyan', color: '#8be9fd' },
			{ name: 'Purple', color: '#bd93f9' },
			{ name: 'Pink', color: '#ff79c6' },
		],
	},
	{
		id: 'gruvbox',
		label: 'Gruvbox',
		colors: [
			{ name: 'Red', color: '#fb4934' },
			{ name: 'Orange', color: '#fe8019' },
			{ name: 'Yellow', color: '#fabd2f' },
			{ name: 'Green', color: '#b8bb26' },
			{ name: 'Aqua', color: '#8ec07c' },
			{ name: 'Blue', color: '#83a598' },
			{ name: 'Purple', color: '#d3869b' },
		],
	},
];

/** The palette with the given id, falling back to the first one (Tokyo Night). */
export function getColorPalette(id: string): ColorPalette {
	return COLOR_PALETTES.find(palette => palette.id === id) ?? COLOR_PALETTES[0];
}

/**
 * Color a newly added rule starts with: the first palette color no existing
 * rule uses yet, cycling through the palette once all of them are taken.
 */
export function nextPaletteColor(palette: ColorPalette, rules: PropertyColorRule[]): string {
	const used = new Set(rules.map(rule => (rule.color ?? '').toLowerCase()));
	const unused = palette.colors.find(entry => !used.has(entry.color));
	return (unused ?? palette.colors[rules.length % palette.colors.length]).color;
}

/** Property names of one rule: a comma-separated list, trimmed and de-duplicated. */
export function parsePropertyNames(value: string): string[] {
	const seen = new Set<string>();
	return (value ?? '')
		.split(',')
		.map(name => name.trim())
		.filter(name => {
			const key = name.toLowerCase();
			if (!name || seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		});
}

const KEY_INPUT = 'input.metadata-property-key-input';

/**
 * CSS that colors the key (name) of properties in the Properties editor.
 * `defaultColor` applies to every property; each rule then overrides it for
 * the properties it lists. Rules without a name or with a non-hex color are
 * skipped; names match case-insensitively, like Obsidian's own property lookup.
 */
export function buildPropertyColorCss(rules: PropertyColorRule[], defaultColor = ''): string {
	const blocks: string[] = [];
	const fallback = defaultColor.trim();
	if (HEX_COLOR.test(fallback)) {
		blocks.push(`.metadata-property ${KEY_INPUT} { color: ${fallback}; }`);
	}
	for (const rule of rules) {
		const color = (rule.color ?? '').trim();
		const names = parsePropertyNames(rule.property);
		if (names.length === 0 || !HEX_COLOR.test(color)) {
			continue;
		}
		const selectors = names.map(name => `.metadata-property[data-property-key="${cssString(name)}" i] ${KEY_INPUT}`);
		blocks.push(`${selectors.join(',\n')} { color: ${color}; }`);
	}
	return blocks.join('\n');
}

/**
 * Per-property key colors: makes chosen properties easier to spot by giving
 * their name a custom text color. Purely visual — a generated stylesheet is
 * attached to every Obsidian window and removed again on unload.
 */
export class PropertyColorService {
	private app: App;
	private plugin: Plugin;
	private settings: CrystalPluginSettings;
	private styleEls: Set<HTMLStyleElement> = new Set();

	constructor(app: App, plugin: Plugin, settings: CrystalPluginSettings) {
		this.app = app;
		this.plugin = plugin;
		this.settings = settings;
	}

	onload() {
		this.attach(document);
		// Pop-out windows have their own document, so they need their own copy.
		this.plugin.registerEvent(this.app.workspace.on('window-open', (_win, win) => this.attach(win.document)));
		this.plugin.register(() => this.clear());
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
		this.refresh();
	}

	private attach(doc: Document) {
		if (doc.getElementById(PROPERTY_COLOR_STYLE_ID)) {
			return;
		}
		const styleEl = doc.createElement('style');
		styleEl.id = PROPERTY_COLOR_STYLE_ID;
		styleEl.textContent = this.css();
		doc.head.appendChild(styleEl);
		this.styleEls.add(styleEl);
	}

	private refresh() {
		const css = this.css();
		for (const styleEl of this.styleEls) {
			if (!styleEl.isConnected) {
				// Its pop-out window was closed.
				this.styleEls.delete(styleEl);
			} else if (styleEl.textContent !== css) {
				styleEl.textContent = css;
			}
		}
	}

	private css(): string {
		return buildPropertyColorCss(this.settings.propertyColors ?? [], this.settings.propertyColorDefault ?? '');
	}

	private clear() {
		this.styleEls.forEach(styleEl => styleEl.remove());
		this.styleEls.clear();
	}
}
