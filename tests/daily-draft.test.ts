import { extractDraftBody, resolveDraftPath } from '../src/daily-draft';

describe('resolveDraftPath', () => {
	test('appends .md and strips a leading slash', () => {
		expect(resolveDraftPath('/Inbox/Draft')).toBe('Inbox/Draft.md');
	});

	test('keeps an explicit .md path', () => {
		expect(resolveDraftPath('Draft.md')).toBe('Draft.md');
	});

	test('falls back to tmp.md when empty', () => {
		expect(resolveDraftPath('  ')).toBe('tmp.md');
	});
});

describe('extractDraftBody', () => {
	test('drops frontmatter and surrounding blank lines', () => {
		expect(extractDraftBody('---\ntags: draft\n---\n\nhello\nworld\n\n')).toBe('hello\nworld');
	});

	test('returns an empty string for a blank draft', () => {
		expect(extractDraftBody('---\ntags: draft\n---\n\n  \n')).toBe('');
	});
});
