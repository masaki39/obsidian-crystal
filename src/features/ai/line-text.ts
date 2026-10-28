export function getLineIndent(lineText: string): string {
	// インデント部分を抽出（先頭の空白、タブ、リストマーカーなど）
	const indentMatch = lineText.match(/^(\s*(?:[-*+]\s+|\d+\.\s+|>\s*)*)/);
	return indentMatch ? indentMatch[1] : '';
}

export async function getPureTextFromLine(lineText: string): Promise<string> {
	return lineText.slice(getLineIndent(lineText).length).trim();
}
