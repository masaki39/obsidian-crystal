import { isExcludedFromAutoLink, parseExcludeFolders } from '../src/features/daily-notes/auto-link-exclude';

describe('isExcludedFromAutoLink', () => {
	const folders = ['kaname/logs'];

	test('matches files directly inside the folder', () => {
		expect(isExcludedFromAutoLink('kaname/logs/a.md', folders)).toBe(true);
	});

	test('matches nested subfolders', () => {
		expect(isExcludedFromAutoLink('kaname/logs/sub/b.md', folders)).toBe(true);
	});

	test('does not match a sibling with the same prefix', () => {
		expect(isExcludedFromAutoLink('kaname/logs2/a.md', folders)).toBe(false);
	});

	test('does not match unrelated or parent paths', () => {
		expect(isExcludedFromAutoLink('kaname/a.md', folders)).toBe(false);
		expect(isExcludedFromAutoLink('other/kaname/logs/a.md', folders)).toBe(false);
	});

	test('tolerates trailing slash and whitespace in entries', () => {
		expect(isExcludedFromAutoLink('kaname/logs/a.md', [' kaname/logs/ '])).toBe(true);
	});

	test('empty list or blank entries exclude nothing', () => {
		expect(isExcludedFromAutoLink('a.md', [])).toBe(false);
		expect(isExcludedFromAutoLink('a.md', ['', '  ', '/'])).toBe(false);
	});
});

describe('parseExcludeFolders', () => {
	test('trims, drops blank lines and trailing slashes', () => {
		expect(parseExcludeFolders('  kaname/logs/ \n\n\r\nfoo//\n  \n')).toEqual(['kaname/logs', 'foo']);
	});
});
