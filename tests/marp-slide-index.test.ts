import { lineForSlideNumber, slideNumberForLine } from '../src/marp-slide-index';

const deck = [
	'---',              // 0 front matter 開始
	'marp: true',       // 1
	'---',              // 2 front matter 終了
	'',                 // 3
	'# A',              // 4  -> slide 1
	'',                 // 5
	'***',              // 6  区切り
	'',                 // 7
	'# B',              // 8  -> slide 2
	'',                 // 9
	'___',              // 10 区切り
	'',                 // 11
	'# C',              // 12 -> slide 3
	'',                 // 13
	'- - -',            // 14 区切り
	'',                 // 15
	'# D',              // 16 -> slide 4
	'',                 // 17
	'----',             // 18 区切り
	'',                 // 19
	'# E',              // 20 -> slide 5
	'',                 // 21
	'Setext heading',   // 22
	'---',              // 23 setext 見出しの下線（区切りではない）
	'',                 // 24
	'```',              // 25
	'---',              // 26 コードフェンス内（区切りではない）
	'```',              // 27
	'',                 // 28
	'# G'               // 29 -> slide 5 のまま
].join('\n');

describe('slideNumberForLine', () => {
	it('front matter 内はスライド1として扱う', () => {
		expect(slideNumberForLine(deck, 1)).toBe(1);
	});

	it('各種 thematic break でスライドを数える', () => {
		expect(slideNumberForLine(deck, 4)).toBe(1);
		expect(slideNumberForLine(deck, 8)).toBe(2);
		expect(slideNumberForLine(deck, 12)).toBe(3);
		expect(slideNumberForLine(deck, 16)).toBe(4);
		expect(slideNumberForLine(deck, 20)).toBe(5);
	});

	it('区切り行にカーソルがある場合は次のスライドを指す', () => {
		expect(slideNumberForLine(deck, 6)).toBe(2);
	});

	it('setext 見出しの下線とコードフェンス内の --- は数えない', () => {
		expect(slideNumberForLine(deck, 23)).toBe(5);
		expect(slideNumberForLine(deck, 26)).toBe(5);
		expect(slideNumberForLine(deck, 29)).toBe(5);
	});

	it('front matter が無いファイルでも動作する', () => {
		const content = ['# A', '', '---', '', '# B'].join('\n');
		expect(slideNumberForLine(content, 0)).toBe(1);
		expect(slideNumberForLine(content, 4)).toBe(2);
	});

	it('閉じていない front matter は front matter として扱わない', () => {
		const content = ['---', 'marp: true', '', '# A'].join('\n');
		expect(slideNumberForLine(content, 3)).toBe(2);
	});

	it('カーソル行が範囲外でも最後のスライド番号を返す', () => {
		expect(slideNumberForLine(deck, 9999)).toBe(5);
	});
});

describe('lineForSlideNumber', () => {
	it('各スライドの本文開始行を返す（空行は読み飛ばす）', () => {
		expect(lineForSlideNumber(deck, 1)).toBe(4);   // # A
		expect(lineForSlideNumber(deck, 2)).toBe(8);   // # B
		expect(lineForSlideNumber(deck, 3)).toBe(12);  // # C
		expect(lineForSlideNumber(deck, 4)).toBe(16);  // # D
		expect(lineForSlideNumber(deck, 5)).toBe(20);  // # E
	});

	it('範囲外のスライド番号は端に丸める', () => {
		expect(lineForSlideNumber(deck, 0)).toBe(4);
		expect(lineForSlideNumber(deck, 99)).toBe(20);
	});

	it('slideNumberForLine と往復しても同じスライドになる', () => {
		for (let slide = 1; slide <= 5; slide++) {
			expect(slideNumberForLine(deck, lineForSlideNumber(deck, slide))).toBe(slide);
		}
	});

	it('front matter のみのファイルでも例外にならない', () => {
		const content = ['---', 'marp: true', '---', ''].join('\n');
		expect(lineForSlideNumber(content, 1)).toBe(3);
	});
});
