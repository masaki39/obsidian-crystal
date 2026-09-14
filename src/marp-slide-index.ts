/**
 * Marp（Marpit）のスライド区切り規則にしたがって、
 * ソース上の行とスライド番号を相互に変換するユーティリティ。
 *
 * Marpit は markdown の thematic break（`---` / `***` / `___`）でスライドを分割する。
 * 以下は区切りにならないため除外する必要がある:
 * - 先頭の YAML front matter
 * - フェンスドコードブロック内の `---`
 * - 段落直下の `---`（setext 見出しの下線として解釈される）
 */

export interface SlideRange {
	/** スライドの直前にある区切り行（0始まり）。先頭スライドは null */
	separatorLine: number | null;
	/** スライド本文の開始行（0始まり）。先頭の空行は読み飛ばす */
	startLine: number;
	/** スライドが占める領域の先頭行（区切り行の次の行。空行も含む） */
	regionStart: number;
	/** スライドが占める領域の末尾行（次の区切り行の手前。この行を含む） */
	regionEnd: number;
}

/** thematic break（区切り線）かどうか */
function isThematicBreak(line: string): boolean {
	return /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line);
}

/** `-` のみで構成された行（setext 見出しの下線になり得る形） */
function isDashOnlyLine(line: string): boolean {
	return /^ {0,3}-+[ \t]*$/.test(line);
}

/**
 * 直前の行が段落なら、`---` は setext 見出しの下線であり区切りではない。
 * 見出し・リスト・引用・フェンス・HTML などの直後は段落ではないため区切りとして扱う。
 */
function isSetextUnderline(lines: string[], index: number): boolean {
	if (!isDashOnlyLine(lines[index])) {
		return false;
	}

	const previous = index > 0 ? lines[index - 1] : '';
	if (previous.trim() === '') {
		return false;
	}

	const notParagraph = [
		/^ {0,3}#{1,6}(?:\s|$)/,        // ATX 見出し
		/^ {0,3}(?:`{3,}|~{3,})/,        // コードフェンス
		/^ {0,3}>/,                      // 引用
		/^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:\s|$)/, // リスト
		/^ {0,3}</                       // HTML / Marp のディレクティブコメント
	];

	if (notParagraph.some(pattern => pattern.test(previous)) || isThematicBreak(previous)) {
		return false;
	}

	return true;
}

/**
 * front matter を読み飛ばした後の開始行を返す
 */
function skipFrontMatter(lines: string[]): number {
	if (lines[0]?.trim() !== '---') {
		return 0;
	}

	for (let i = 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (trimmed === '---' || trimmed === '...') {
			return i + 1;
		}
	}

	// 閉じていない場合は front matter とみなさない
	return 0;
}

/**
 * 区切り行の一覧（0始まりの行番号）を返す
 */
function findSeparatorLines(lines: string[], start: number): number[] {
	const separators: number[] = [];
	let fence: string | null = null;

	for (let i = start; i < lines.length; i++) {
		const line = lines[i];
		const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);

		if (fence !== null) {
			// フェンス内は区切り判定をしない。同種のフェンスで閉じる
			if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
				fence = null;
			}
			continue;
		}

		if (fenceMatch) {
			fence = fenceMatch[1];
			continue;
		}

		if (isThematicBreak(line) && !isSetextUnderline(lines, i)) {
			separators.push(i);
		}
	}

	return separators;
}

/**
 * 各スライドの区切り行と本文開始行を求める
 */
export function scanSlides(content: string): SlideRange[] {
	const lines = content.split('\n');
	const contentStart = skipFrontMatter(lines);
	const separators = findSeparatorLines(lines, contentStart);

	const firstNonBlankFrom = (from: number, limit: number): number => {
		for (let i = from; i < Math.min(limit, lines.length); i++) {
			if (lines[i].trim() !== '') return i;
		}
		return Math.min(from, Math.max(lines.length - 1, 0));
	};

	const lastLine = Math.max(lines.length - 1, 0);
	const slides: SlideRange[] = [{
		separatorLine: null,
		startLine: firstNonBlankFrom(contentStart, separators[0] ?? lines.length),
		regionStart: contentStart,
		regionEnd: separators.length > 0 ? separators[0] - 1 : lastLine
	}];

	separators.forEach((separator, index) => {
		const next = separators[index + 1];
		slides.push({
			separatorLine: separator,
			startLine: firstNonBlankFrom(separator + 1, next ?? lines.length),
			regionStart: separator + 1,
			regionEnd: next !== undefined ? next - 1 : lastLine
		});
	});

	return slides;
}

/**
 * カーソル行（0始まり）が属するスライド番号（1始まり）を返す。
 * カーソルが区切り行そのものにある場合は、その次のスライドを指す。
 */
export function slideNumberForLine(content: string, cursorLine: number): number {
	const slides = scanSlides(content);

	let slide = 1;
	for (let i = 1; i < slides.length; i++) {
		if ((slides[i].separatorLine ?? 0) <= cursorLine) {
			slide = i + 1;
		}
	}

	return slide;
}

/**
 * スライド番号（1始まり）に対応する本文開始行（0始まり）を返す
 */
export function lineForSlideNumber(content: string, slideNumber: number): number {
	const slides = scanSlides(content);
	const index = Math.min(Math.max(slideNumber, 1), slides.length) - 1;
	return slides[index].startLine;
}
