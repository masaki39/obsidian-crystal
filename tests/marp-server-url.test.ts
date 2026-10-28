import type { TFile } from 'obsidian';
import {
	MARP_SERVER_ORIGIN,
	buildPageUrl,
	pageUrlForFile,
	slideNumberFromUrl,
	slideRelativePath,
	vaultPathForUrl
} from '../src/features/marp/server-url';

const createFile = (path: string): TFile => {
	const extension = path.includes('.') ? path.split('.').pop()! : '';
	return { path, extension } as TFile;
};

describe('slideRelativePath', () => {
	it('スライドフォルダ配下なら相対パスを返す', () => {
		expect(slideRelativePath(createFile('slides/deck.md'), 'slides')).toBe('deck.md');
		expect(slideRelativePath(createFile('slides/sub/deck.md'), 'slides')).toBe('sub/deck.md');
	});

	it('フォルダ外・md以外・未設定なら null', () => {
		expect(slideRelativePath(createFile('notes/deck.md'), 'slides')).toBeNull();
		expect(slideRelativePath(createFile('slides/image.png'), 'slides')).toBeNull();
		expect(slideRelativePath(createFile('slides/deck.md'), '')).toBeNull();
	});

	it('似た名前のフォルダを取り違えない', () => {
		expect(slideRelativePath(createFile('slides-old/deck.md'), 'slides')).toBeNull();
	});
});

describe('buildPageUrl / pageUrlForFile', () => {
	it('パスをURLエンコードする', () => {
		expect(buildPageUrl('my deck.md')).toBe(`${MARP_SERVER_ORIGIN}/my%20deck.md`);
		expect(buildPageUrl('sub/発表.md')).toBe(`${MARP_SERVER_ORIGIN}/sub/${encodeURIComponent('発表')}.md`);
	});

	it('区切りのスラッシュはエンコードしない', () => {
		expect(pageUrlForFile(createFile('slides/sub/deck.md'), 'slides'))
			.toBe(`${MARP_SERVER_ORIGIN}/sub/deck.md`);
	});
});

describe('vaultPathForUrl', () => {
	it('URLから vault 内のパスを復元する', () => {
		expect(vaultPathForUrl(`${MARP_SERVER_ORIGIN}/sub/deck.md#3`, 'slides')).toBe('slides/sub/deck.md');
		expect(vaultPathForUrl(`${MARP_SERVER_ORIGIN}/my%20deck.md`, 'slides')).toBe('slides/my deck.md');
	});

	it('往復して元のパスに戻る', () => {
		const file = createFile('slides/sub/発表 1.md');
		const url = pageUrlForFile(file, 'slides');
		expect(vaultPathForUrl(`${url}#2`, 'slides')).toBe(file.path);
	});

	it('別オリジンやトップページは null', () => {
		expect(vaultPathForUrl('http://example.com/deck.md', 'slides')).toBeNull();
		expect(vaultPathForUrl(`${MARP_SERVER_ORIGIN}/`, 'slides')).toBeNull();
	});
});

describe('slideNumberFromUrl', () => {
	it('ハッシュのスライド番号を取り出す', () => {
		expect(slideNumberFromUrl(`${MARP_SERVER_ORIGIN}/deck.md#5`)).toBe(5);
	});

	it('テキストフラグメント付きでも数値を取り出す', () => {
		expect(slideNumberFromUrl(`${MARP_SERVER_ORIGIN}/deck.md#5:~:text=hello`)).toBe(5);
	});

	it('番号以外のハッシュや無しは null', () => {
		expect(slideNumberFromUrl(`${MARP_SERVER_ORIGIN}/deck.md`)).toBeNull();
		expect(slideNumberFromUrl(`${MARP_SERVER_ORIGIN}/deck.md#section-title`)).toBeNull();
		expect(slideNumberFromUrl(`${MARP_SERVER_ORIGIN}/deck.md#0`)).toBeNull();
	});
});
