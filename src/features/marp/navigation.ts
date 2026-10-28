import { Editor, Notice } from 'obsidian';
import { lineForSlideNumber, slideNumberForLine } from './slide-index';
import { moveSlide } from './slide-ops';

/**
 * カーソルを前後のスライドの先頭へ移動する
 */
export function goToAdjacentSlide(editor: Editor, direction: -1 | 1) {
	const content = editor.getValue();
	const current = slideNumberForLine(content, editor.getCursor().line);
	const target = current + direction;

	const line = lineForSlideNumber(content, target);
	editor.setCursor({ line, ch: 0 });
	editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
}

/**
 * カーソルのあるスライドを前後のスライドと入れ替える
 */
export function moveCurrentSlide(editor: Editor, direction: -1 | 1) {
	const content = editor.getValue();
	const current = slideNumberForLine(content, editor.getCursor().line);
	const move = moveSlide(content, current, direction);

	if (!move) {
		new Notice(direction === 1 ? '⚠️ これ以上後ろに移動できません' : '⚠️ これ以上前に移動できません');
		return;
	}

	const endLength = content.split('\n')[move.toLine]?.length ?? 0;
	editor.replaceRange(
		move.text,
		{ line: move.fromLine, ch: 0 },
		{ line: move.toLine, ch: endLength }
	);

	// 移動したスライドを追いかける
	const line = lineForSlideNumber(editor.getValue(), move.slideNumber);
	editor.setCursor({ line, ch: 0 });
	editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
}
