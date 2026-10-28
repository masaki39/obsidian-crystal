import { moveSlide } from '../src/features/marp/slide-ops';
import { slideNumberForLine } from '../src/features/marp/slide-index';

/** moveSlide の結果を実際に適用する（エディタの replaceRange 相当） */
const applyMove = (content: string, move: ReturnType<typeof moveSlide>): string => {
	if (!move) throw new Error('move is null');
	const lines = content.split('\n');
	lines.splice(move.fromLine, move.toLine - move.fromLine + 1, ...move.text.split('\n'));
	return lines.join('\n');
};

const deck = [
	'---',
	'marp: true',
	'---',
	'',
	'# A',
	'',
	'---',
	'',
	'# B',
	'',
	'---',
	'',
	'# C',
	''
].join('\n');

describe('moveSlide', () => {
	it('次のスライドと入れ替える', () => {
		const moved = applyMove(deck, moveSlide(deck, 1, 1));
		expect(moved).toBe([
			'---',
			'marp: true',
			'---',
			'',
			'# B',
			'',
			'---',
			'',
			'# A',
			'',
			'---',
			'',
			'# C',
			''
		].join('\n'));
	});

	it('前のスライドと入れ替える（逆操作で元に戻る）', () => {
		const moved = applyMove(deck, moveSlide(deck, 2, 1));
		const restored = applyMove(moved, moveSlide(moved, 3, -1));
		expect(restored).toBe(deck);
	});

	it('区切り記号の種類と位置は維持される', () => {
		const mixed = ['# A', '', '***', '', '# B', '', '---', '', '# C'].join('\n');
		const moved = applyMove(mixed, moveSlide(mixed, 1, 1));
		expect(moved).toBe(['# B', '', '***', '', '# A', '', '---', '', '# C'].join('\n'));
	});

	it('複数行のスライドを丸ごと入れ替える', () => {
		const content = ['# A', 'body a', '', '---', '', '# B', 'body b1', 'body b2'].join('\n');
		const moved = applyMove(content, moveSlide(content, 2, -1));
		expect(moved).toBe(['# B', 'body b1', 'body b2', '', '---', '', '# A', 'body a'].join('\n'));
	});

	it('入れ替え後のスライド番号を返す', () => {
		expect(moveSlide(deck, 1, 1)?.slideNumber).toBe(2);
		expect(moveSlide(deck, 3, -1)?.slideNumber).toBe(2);
	});

	it('端のスライドは移動できない', () => {
		expect(moveSlide(deck, 1, -1)).toBeNull();
		expect(moveSlide(deck, 3, 1)).toBeNull();
		expect(moveSlide(deck, 99, 1)).toBeNull();
	});

	it('入れ替えてもスライド数は変わらない', () => {
		const moved = applyMove(deck, moveSlide(deck, 2, 1));
		expect(slideNumberForLine(moved, moved.split('\n').length - 1)).toBe(3);
	});
});
