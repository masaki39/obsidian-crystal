import { COLOR_PALETTES, buildPropertyColorCss, getColorPalette, nextPaletteColor, parsePropertyNames } from '../src/property-color';

describe('buildPropertyColorCss', () => {
	it('returns an empty string without rules', () => {
		expect(buildPropertyColorCss([])).toBe('');
	});

	it('colors the key input of each configured property', () => {
		const css = buildPropertyColorCss([
			{ property: 'tags', color: '#ff0000' },
			{ property: 'status', color: '#00ff00' },
		]);
		expect(css.split('\n')).toEqual([
			'.metadata-property[data-property-key="tags" i] input.metadata-property-key-input { color: #ff0000; }',
			'.metadata-property[data-property-key="status" i] input.metadata-property-key-input { color: #00ff00; }',
		]);
	});

	it('trims the property name', () => {
		expect(buildPropertyColorCss([{ property: '  due date ', color: '#abc' }])).toContain('[data-property-key="due date" i]');
	});

	it('skips rules with an empty property name', () => {
		expect(buildPropertyColorCss([{ property: '  ', color: '#ff0000' }])).toBe('');
	});

	it('skips rules whose color is not a hex color', () => {
		expect(buildPropertyColorCss([
			{ property: 'a', color: '' },
			{ property: 'b', color: 'red; } body { display: none' },
		])).toBe('');
	});

	it('escapes quotes and backslashes in the property name', () => {
		expect(buildPropertyColorCss([{ property: 'a"b\\c', color: '#ff0000' }])).toContain('[data-property-key="a\\"b\\\\c" i]');
	});

	it('colors several properties with one rule', () => {
		expect(buildPropertyColorCss([{ property: 'status, priority', color: '#ff0000' }])).toBe(
			'.metadata-property[data-property-key="status" i] input.metadata-property-key-input,\n' +
			'.metadata-property[data-property-key="priority" i] input.metadata-property-key-input { color: #ff0000; }'
		);
	});

	it('puts the default color first so that rules override it', () => {
		const css = buildPropertyColorCss([{ property: 'tags', color: '#ff0000' }], '#7aa2f7');
		expect(css.split('\n')).toEqual([
			'.metadata-property input.metadata-property-key-input { color: #7aa2f7; }',
			'.metadata-property[data-property-key="tags" i] input.metadata-property-key-input { color: #ff0000; }',
		]);
	});

	it('ignores a default color that is not a hex color', () => {
		expect(buildPropertyColorCss([], 'red')).toBe('');
	});
});

describe('parsePropertyNames', () => {
	it('splits on commas, trims and drops empty names', () => {
		expect(parsePropertyNames(' status , priority,, ')).toEqual(['status', 'priority']);
	});

	it('drops case-insensitive duplicates', () => {
		expect(parsePropertyNames('Status, status')).toEqual(['Status']);
	});
});

describe('color palettes', () => {
	const palette = getColorPalette('tokyo-night');

	it('falls back to the first palette for an unknown id', () => {
		expect(getColorPalette('nope')).toBe(COLOR_PALETTES[0]);
	});

	it('only contains lowercase 6-digit hex colors', () => {
		for (const entry of COLOR_PALETTES.flatMap(p => p.colors)) {
			expect(entry.color).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('starts a new rule with the first unused palette color', () => {
		expect(nextPaletteColor(palette, [])).toBe(palette.colors[0].color);
		expect(nextPaletteColor(palette, [{ property: 'a', color: palette.colors[0].color.toUpperCase() }])).toBe(palette.colors[1].color);
	});

	it('cycles through the palette once every color is used', () => {
		const rules = palette.colors.map(entry => ({ property: 'a', color: entry.color }));
		expect(nextPaletteColor(palette, rules)).toBe(palette.colors[0].color);
	});
});
