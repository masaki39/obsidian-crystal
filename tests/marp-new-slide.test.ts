import { buildSlideBasename, buildSlideContent, expandPlaceholders, getParentTitle } from '../src/features/marp/new-slide';
import { CrystalPluginSettings, DEFAULT_SETTINGS } from '../src/settings';

const settings = (o: Partial<CrystalPluginSettings> = {}): CrystalPluginSettings => ({ ...DEFAULT_SETTINGS, ...o });
const now = new Date(2026, 10, 10, 9, 0, 0);

describe('getParentTitle', () => {
	it('uses the basename by default', () => {
		expect(getParentTitle('Note', { aliases: ['Alias'] }, 'basename')).toBe('Note');
	});
	it('uses aliases[0] when requested', () => {
		expect(getParentTitle('Note', { aliases: ['Alias', 'B'] }, 'alias')).toBe('Alias');
		expect(getParentTitle('Note', { aliases: 'Single' }, 'alias')).toBe('Single');
	});
	it('falls back to the basename without aliases', () => {
		expect(getParentTitle('Note', undefined, 'alias')).toBe('Note');
		expect(getParentTitle('Note', { aliases: [] }, 'alias')).toBe('Note');
	});
});

describe('buildSlideBasename', () => {
	it('joins prefix, date and title', () => {
		expect(buildSlideBasename(settings({ marpNewSlidePrefix: 'Slide-' }), 'My talk', now)).toBe('Slide-2026-11-10 My talk');
	});
	it('omits the date when the format is empty', () => {
		expect(buildSlideBasename(settings({ marpNewSlideDateFormat: '' }), 'My talk', now)).toBe('My talk');
	});
	it('strips characters invalid in file names', () => {
		expect(buildSlideBasename(settings({ marpNewSlideDateFormat: '' }), 'A/B: C?', now)).toBe('A B C');
	});
});

describe('buildSlideContent', () => {
	it('writes Marp defaults and a title slide', () => {
		expect(buildSlideContent(settings({ marpNewSlideTheme: 'gaia', marpNewSlideHeader: '{{title}} | Lab' }), 'Talk'))
			.toBe('---\nmarp: true\ntheme: "gaia"\npaginate: true\nheader: "Talk | Lab"\n---\n\n# Talk\n');
	});
	it('omits empty optional properties', () => {
		expect(buildSlideContent(settings({ marpNewSlidePaginate: false }), 'Talk'))
			.toBe('---\nmarp: true\n---\n\n# Talk\n');
	});
});

describe('expandPlaceholders', () => {
	it('expands title and date with the file-name format', () => {
		expect(expandPlaceholders('{{title}} | {{date}}', settings({ marpNewSlideDateFormat: 'YYYYMMDD' }), 'Talk', now)).toBe('Talk | 20261110');
	});
	it('falls back to YYYY-MM-DD when the file-name format is empty', () => {
		expect(expandPlaceholders('{{date}}', settings({ marpNewSlideDateFormat: '' }), 'Talk', now)).toBe('2026-11-10');
	});
	it('accepts a custom format', () => {
		expect(expandPlaceholders('{{date:YYYY/MM/DD}}', settings(), 'Talk', now)).toBe('2026/11/10');
	});
	it('is used for the header', () => {
		expect(buildSlideContent(settings({ marpNewSlidePaginate: false, marpNewSlideHeader: '{{date:YYYY.M}}' }), 'Talk', now))
			.toBe('---\nmarp: true\nheader: "2026.11"\n---\n\n# Talk\n');
	});
});
