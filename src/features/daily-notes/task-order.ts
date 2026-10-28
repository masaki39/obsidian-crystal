/**
 * Sort each list block of a daily note: completed tasks, open tasks, then
 * other bullets (open tasks first when `newestFirst`). Nested lines move with
 * their parent item.
 */
export function orderTaskList(taskList: string, newestFirst: boolean): string {
	const lines = taskList.split('\n');
	const orderedLines: string[] = [];
	let buffer: string[] = [];
	const endedWithNewline = taskList.endsWith('\n');

	const flushBuffer = () => {
		if (buffer.length === 0) {
			return;
		}
		const isListBlock = buffer.every(line => line.trim().startsWith('- '));

		if (isListBlock) {
			const done: string[] = [];
			const todo: string[] = [];
			const otherBullets: string[] = [];

			// Group each top-level item with its nested lines so children move with their parent.
			const indentOf = (line: string) => line.length - line.trimStart().length;
			const baseIndent = Math.min(...buffer.map(indentOf));
			const groups: string[][] = [];
			for (const line of buffer) {
				if (indentOf(line) <= baseIndent || groups.length === 0) {
					groups.push([line]);
				} else {
					groups[groups.length - 1].push(line);
				}
			}

			const isDone = (line: string) => /^- \[[xX]\]/.test(line.trim());
			const isTodo = (line: string) => /^- \[\s?\]/.test(line.trim());

			for (const group of groups) {
				const [head, ...children] = group;
				if (isDone(head)) {
					// A checked parent stays with the todos until every nested task is checked.
					(children.some(isTodo) ? todo : done).push(...group);
				} else if (isTodo(head)) {
					todo.push(...group);
				} else {
					otherBullets.push(...group);
				}
			}

			if (newestFirst) {
				orderedLines.push(...todo, ...done, ...otherBullets);
			} else {
				orderedLines.push(...done, ...todo, ...otherBullets);
			}
		} else {
			orderedLines.push(...buffer);
		}
		buffer = [];
	};

	for (const line of lines) {
		if (line.trim() === '') {
			flushBuffer();
			orderedLines.push(line);
		} else {
			buffer.push(line);
		}
	}
	flushBuffer();

	const joined = orderedLines.join('\n');
	if (endedWithNewline && !joined.endsWith('\n')) {
		return joined + '\n';
	}
	return joined;
}
