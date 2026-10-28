import { type SlideRange, scanSlides } from './marp-slide-index';

/** スライドの入れ替え結果（エディタへの置換指示） */
export interface SlideMove {
	/** 置換する範囲の開始行（0始まり） */
	fromLine: number;
	/** 置換する範囲の終了行（0始まり・この行を含む） */
	toLine: number;
	/** 置換後のテキスト */
	text: string;
	/** 入れ替え後に対象スライドが何番目になるか */
	slideNumber: number;
}

/**
 * 領域を「前後の空行」と「本文」に分解する。
 * 入れ替えの際に空行の配置を保つために使う。
 */
function splitPadding(lines: string[]): { lead: string[]; core: string[]; trail: string[] } {
	let start = 0;
	let end = lines.length;

	while (start < end && lines[start].trim() === '') start++;
	while (end > start && lines[end - 1].trim() === '') end--;

	return {
		lead: lines.slice(0, start),
		core: lines.slice(start, end),
		trail: lines.slice(end)
	};
}

/**
 * 指定スライドを前後のスライドと入れ替える。
 * 区切り行と空行の配置はそのままに、本文だけを入れ替える。
 *
 * @param direction -1 で前のスライドと、1 で次のスライドと入れ替える
 * @returns 入れ替えられない場合は null
 */
export function moveSlide(content: string, slideNumber: number, direction: -1 | 1): SlideMove | null {
	const lines = content.split('\n');
	const slides = scanSlides(content);

	const targetNumber = slideNumber + direction;
	if (slideNumber < 1 || slideNumber > slides.length) return null;
	if (targetNumber < 1 || targetNumber > slides.length) return null;

	const first: SlideRange = direction === 1 ? slides[slideNumber - 1] : slides[targetNumber - 1];
	const second: SlideRange = direction === 1 ? slides[targetNumber - 1] : slides[slideNumber - 1];

	const firstRegion = splitPadding(lines.slice(first.regionStart, first.regionEnd + 1));
	const secondRegion = splitPadding(lines.slice(second.regionStart, second.regionEnd + 1));
	// 2つの領域の間にある区切り行はそのまま残す
	const between = lines.slice(first.regionEnd + 1, second.regionStart);

	const swapped = [
		...firstRegion.lead,
		...secondRegion.core,
		...firstRegion.trail,
		...between,
		...secondRegion.lead,
		...firstRegion.core,
		...secondRegion.trail
	];

	return {
		fromLine: first.regionStart,
		toLine: second.regionEnd,
		text: swapped.join('\n'),
		slideNumber: targetNumber
	};
}
