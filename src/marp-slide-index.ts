/**
 * Marp（Marpit）のスライド区切り規則にしたがって、
 * カーソル行が何枚目のスライドに含まれるかを求めるユーティリティ。
 *
 * Marpit は markdown の thematic break（`---` / `***` / `___`）でスライドを分割する。
 * 以下は区切りにならないため除外する必要がある:
 * - 先頭の YAML front matter
 * - フェンスドコードブロック内の `---`
 * - 段落直下の `---`（setext 見出しの下線として解釈される）
 */

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
 * カーソル行（0始まり）が属するスライド番号（1始まり）を返す。
 * カーソルが区切り行そのものにある場合は、その次のスライドを指す。
 */
export function slideNumberForLine(content: string, cursorLine: number): number {
	const lines = content.split('\n');
	const start = skipFrontMatter(lines);
	const end = Math.min(cursorLine, lines.length - 1);

	let slide = 1;
	let fence: string | null = null;

	for (let i = start; i <= end; i++) {
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
			slide++;
		}
	}

	return slide;
}
