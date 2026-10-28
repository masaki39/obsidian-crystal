/**
 * Strip fenced code blocks (``` or ~~~, including indented ones) before
 * scanning for checkboxes, so a note that *documents* task syntax (e.g.
 * explaining the Tasks plugin) inside a code sample isn't counted as real
 * tasks.
 */
function stripCodeBlocks(content: string): string {
	return content.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, '');
}

/** Count completed checkbox tasks (`- [x]`) in note content. */
export function countCompletedTasks(content: string): number {
	const matches = stripCodeBlocks(content).match(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[[xX]\]/gm);
	return matches ? matches.length : 0;
}

/** Count all checkbox tasks (any state: `- [ ]`, `- [x]`, `- [/]`, etc.) in note content. */
export function countTotalTasks(content: string): number {
	const matches = stripCodeBlocks(content).match(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[.\]/gm);
	return matches ? matches.length : 0;
}
