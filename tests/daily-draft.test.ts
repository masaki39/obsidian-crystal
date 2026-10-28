import { extractDraftBody, resolveDraftPath, splitDraftImages } from '../src/features/daily-notes/draft';

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

describe('splitDraftImages', () => {
	test('pulls out remote, relative and wiki image embeds', () => {
		const body = 'hello\n![](https://i.gyazo.com/abc.png)\n![x](attachments/a%20b.webp)\n![[shot.jpg|300]]\nbye';
		expect(splitDraftImages(body)).toEqual({
			text: 'hello\n\nbye',
			images: [
				{ kind: 'url', target: 'https://i.gyazo.com/abc.png' },
				{ kind: 'vault', target: 'attachments/a b.webp' },
				{ kind: 'vault', target: 'shot.jpg' },
			],
		});
	});

	test('leaves non-image embeds in the text', () => {
		expect(splitDraftImages('see ![[note]] and ![](doc.pdf)')).toEqual({
			text: 'see ![[note]] and ![](doc.pdf)',
			images: [],
		});
	});
});
