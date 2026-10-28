import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state';
import {
	type AutoBulletSettings,
	autoBulletRange,
	bulletCursorTarget,
	linesOf,
} from '../src/features/editor/auto-bullet-logic';
import { autoBulletInputFilter, autoBulletTabCommand } from '../src/features/editor/auto-bullet';

const ALL_ON: AutoBulletSettings = {
	autoBulletEnabled: true,
	autoBulletHalfWidthSpace: true,
	autoBulletFullWidthSpace: true,
	autoBulletTab: true,
};

const FULL = '　';

/** Result of typing `char` at the `|` in `doc` (pure logic), or null when it doesn't fire. */
function type(doc: string, char: string, settings: AutoBulletSettings = ALL_ON): { line: string; ch: number } | null {
	const lines = doc.split('\n');
	const lineNo = lines.findIndex(line => line.includes('|'));
	const ch = lines[lineNo].indexOf('|');
	lines[lineNo] = lines[lineNo].replace('|', '');
	const range = autoBulletRange(linesOf(lines), lineNo, ch, char, settings);
	if (!range) return null;
	const line = lines[lineNo];
	return { line: line.slice(0, range.from) + '- ' + line.slice(range.to), ch: range.from + 2 };
}

describe('auto bullet: fires', () => {
	it('1. half-width space on an empty line', () => {
		expect(type('|', ' ')).toEqual({ line: '- ', ch: 2 });
	});

	it('2. full-width space on an empty line', () => {
		expect(type('|', FULL)).toEqual({ line: '- ', ch: 2 });
	});

	it('3. tab on an empty line', () => {
		expect(type('|', '\t')).toEqual({ line: '- ', ch: 2 });
	});

	it('4. at the start of an existing text line', () => {
		expect(type('|foo', ' ')).toEqual({ line: '- foo', ch: 2 });
	});

	it('5. replaces leading whitespace before the cursor (indent is not kept)', () => {
		expect(type('  |', ' ')).toEqual({ line: '- ', ch: 2 });
		expect(type('\t|foo', ' ')).toEqual({ line: '- foo', ch: 2 });
	});

	it('6. on a body line after the frontmatter', () => {
		expect(type('---\ntitle: x\n---\n|', ' ')).toEqual({ line: '- ', ch: 2 });
		expect(type('---\ntitle: x\n...\n|', ' ')).toEqual({ line: '- ', ch: 2 });
	});

	it('7. after a closed code block', () => {
		expect(type('```js\nconst a = 1;\n```\n|', ' ')).toEqual({ line: '- ', ch: 2 });
		expect(type('~~~\ncode\n~~~\n|', ' ')).toEqual({ line: '- ', ch: 2 });
	});

	it('8. after a one-line $$x$$ math block', () => {
		expect(type('$$x$$\n|', ' ')).toEqual({ line: '- ', ch: 2 });
	});
});

describe('auto bullet: does not fire', () => {
	it('9. in the middle of a line', () => {
		expect(type('foo|', ' ')).toBeNull();
		expect(type('fo|o', ' ')).toBeNull();
	});

	it('10. when a trigger or the master switch is off', () => {
		expect(type('|', ' ', { ...ALL_ON, autoBulletHalfWidthSpace: false })).toBeNull();
		expect(type('|', FULL, { ...ALL_ON, autoBulletFullWidthSpace: false })).toBeNull();
		expect(type('|', '\t', { ...ALL_ON, autoBulletTab: false })).toBeNull();
		expect(type('|', ' ', { ...ALL_ON, autoBulletEnabled: false })).toBeNull();
		expect(type('|', FULL, { ...ALL_ON, autoBulletEnabled: false })).toBeNull();
		expect(type('|', '\t', { ...ALL_ON, autoBulletEnabled: false })).toBeNull();
		// the other triggers stay on
		expect(type('|', FULL, { ...ALL_ON, autoBulletHalfWidthSpace: false })).not.toBeNull();
	});

	it('ignores characters that are not triggers', () => {
		expect(type('|', 'a')).toBeNull();
		expect(type('|', '  ')).toBeNull();
	});

	it.each(['- a', '* a', '+ a', '1. a', '1) a', '- [ ] a', '- [x] a', '  - a', '\t1. a'])(
		'11. on an existing list item %j (start and indent position)',
		(line) => {
			expect(type(`|${line}`, ' ')).toBeNull();
			const indent = line.length - line.trimStart().length;
			expect(type(`${line.slice(0, indent)}|${line.slice(indent)}`, ' ')).toBeNull();
		}
	);

	it.each(['# a', '### a', '> a', '> [!note] title'])('12. on a heading / quote / callout %j', (line) => {
		expect(type(`|${line}`, ' ')).toBeNull();
	});

	it.each(['| a | b |', '|---|---|'])('13. on a table row %j', (line) => {
		expect(type(`|${line}`, ' ')).toBeNull();
	});

	it.each(['---', '***', '___', '- - -'])('14. on a horizontal rule %j', (line) => {
		expect(type(`body\n|${line}`, ' ')).toBeNull();
	});

	it('15. inside fenced code (``` and ~~~), on fence lines, and nested shorter fences', () => {
		expect(type('```\n|\n```', ' ')).toBeNull();
		expect(type('~~~\n|\n~~~', ' ')).toBeNull();
		expect(type('|```\ncode\n```', ' ')).toBeNull();
		expect(type('```\ncode\n|```', ' ')).toBeNull();
		expect(type('````\n```\n|\n```\n````', ' ')).toBeNull();
		// unclosed fence runs to the end of the document
		expect(type('```\ncode\n\n|', ' ')).toBeNull();
		// ~~~ doesn't close a ``` fence
		expect(type('```\n~~~\n|\n```', ' ')).toBeNull();
	});

	it('16. inside a $$ math block', () => {
		expect(type('$$\n|\n$$', ' ')).toBeNull();
		expect(type('$$\nx = 1\n|', ' ')).toBeNull();
		expect(type('|$$', ' ')).toBeNull();
	});

	it('17. inside the frontmatter (delimiters and blank lines included)', () => {
		expect(type('---\n|\ntitle: x\n---', ' ')).toBeNull();
		expect(type('---\ntitle: x\n|tags: y\n---', ' ')).toBeNull();
		expect(type('|---\ntitle: x\n---', ' ')).toBeNull();
		expect(type('---\ntitle: x\n|---', ' ')).toBeNull();
	});

	it('18. a --- in the middle of a document is not frontmatter', () => {
		expect(type('intro\n---\n|', ' ')).toEqual({ line: '- ', ch: 2 });
		expect(type('intro\n---\n|---', ' ')).toBeNull();
	});
});

describe('auto bullet: CodeMirror input filter', () => {
	function stateWith(doc: string, cursor: number, settings: AutoBulletSettings = ALL_ON) {
		return EditorState.create({
			doc,
			selection: EditorSelection.cursor(cursor),
			extensions: [autoBulletInputFilter(() => settings)],
		});
	}

	function insert(state: EditorState, text: string, userEvent: string, at = state.selection.main.head) {
		return state.update({ changes: { from: at, insert: text }, selection: { anchor: at + text.length }, userEvent });
	}

	it('19. replaces typed input in a single transaction that a single undo reverts', () => {
		const start = stateWith('first\nfoo', 6);
		const tr = insert(start, ' ', 'input.type');
		expect(tr.state.doc.toString()).toBe('first\n- foo');
		expect(tr.state.selection.main.head).toBe(8);
		expect(tr.isUserEvent('input.type')).toBe(true);
		// What history's undo applies: the inverse of this one transaction.
		expect(tr.changes.invert(start.doc).apply(tr.state.doc).toString()).toBe('first\nfoo');
	});

	it('19b. handles the full-width space too', () => {
		const tr = insert(stateWith('', 0), FULL, 'input.type');
		expect(tr.state.doc.toString()).toBe('- ');
	});

	it('20. leaves paste alone', () => {
		expect(insert(stateWith('', 0), ' ', 'input.paste').state.doc.toString()).toBe(' ');
	});

	it('21. leaves deletions alone (e.g. deleting x from "  x")', () => {
		const start = stateWith('  x', 3);
		const tr = start.update({ changes: { from: 2, to: 3 }, userEvent: 'delete.backward' });
		expect(tr.state.doc.toString()).toBe('  ');
	});

	it('22. leaves IME composition alone', () => {
		expect(insert(stateWith('', 0), FULL, 'input.type.compose').state.doc.toString()).toBe(FULL);
	});

	it('23. leaves multiple cursors alone', () => {
		const start = EditorState.create({
			doc: '\n',
			selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(1)]),
			extensions: [EditorState.allowMultipleSelections.of(true), autoBulletInputFilter(() => ALL_ON)],
		});
		const tr = start.update({ changes: [{ from: 0, insert: ' ' }, { from: 1, insert: ' ' }], userEvent: 'input.type' });
		expect(tr.state.doc.toString()).toBe(' \n ');
	});

	it('24. leaves multi-character inserts alone', () => {
		expect(insert(stateWith('', 0), '  ', 'input.type').state.doc.toString()).toBe('  ');
	});

	it('respects the settings read at keystroke time', () => {
		const settings = { ...ALL_ON };
		const state = EditorState.create({ doc: '', extensions: [autoBulletInputFilter(() => settings)] });
		settings.autoBulletEnabled = false;
		expect(insert(state, ' ', 'input.type').state.doc.toString()).toBe(' ');
		settings.autoBulletEnabled = true;
		expect(insert(state, ' ', 'input.type').state.doc.toString()).toBe('- ');
	});

	it('leaves excluded lines alone', () => {
		expect(insert(stateWith('# a', 0), ' ', 'input.type').state.doc.toString()).toBe(' # a');
	});
});

describe('auto bullet: Tab command', () => {
	function view(doc: string, cursor: number) {
		const target = {
			state: EditorState.create({ doc, selection: EditorSelection.cursor(cursor) }),
			dispatch(...specs: TransactionSpec[]) {
				target.state = target.state.update(...specs).state;
			},
		};
		return target;
	}

	it('3. inserts the bullet on an empty line and handles the key', () => {
		const target = view('', 0);
		expect(autoBulletTabCommand(() => ALL_ON)(target)).toBe(true);
		expect(target.state.doc.toString()).toBe('- ');
		expect(target.state.selection.main.head).toBe(2);
	});

	it('falls through on an existing list item so Tab still indents it', () => {
		const target = view('- item', 0);
		expect(autoBulletTabCommand(() => ALL_ON)(target)).toBe(false);
		expect(target.state.doc.toString()).toBe('- item');
	});

	it('falls through when the Tab trigger or the master switch is off', () => {
		expect(autoBulletTabCommand(() => ({ ...ALL_ON, autoBulletTab: false }))(view('', 0))).toBe(false);
		expect(autoBulletTabCommand(() => ({ ...ALL_ON, autoBulletEnabled: false }))(view('', 0))).toBe(false);
	});

	it('falls through in the middle of a line and with a selection', () => {
		expect(autoBulletTabCommand(() => ALL_ON)(view('foo', 3))).toBe(false);
		const target = view('foo', 0);
		target.state = target.state.update({ selection: EditorSelection.range(0, 3) }).state;
		expect(autoBulletTabCommand(() => ALL_ON)(target)).toBe(false);
	});

	it('falls through inside a code block', () => {
		expect(autoBulletTabCommand(() => ALL_ON)(view('```\n\n```', 4))).toBe(false);
	});
});

describe('bulletCursorTarget', () => {
	it('25. after the bullet, past any indent', () => {
		expect(bulletCursorTarget('- foo')).toBe(2);
		expect(bulletCursorTarget('  - foo')).toBe(4);
		expect(bulletCursorTarget('\t- foo')).toBe(3);
		expect(bulletCursorTarget(`${FULL}- foo`)).toBe(3);
	});

	it('26. after the number of a numbered list', () => {
		expect(bulletCursorTarget('1. foo')).toBe(3);
		expect(bulletCursorTarget('10. foo')).toBe(4);
		expect(bulletCursorTarget('  1. foo')).toBe(5);
	});

	it('27. after the checkbox of a task', () => {
		expect(bulletCursorTarget('- [ ] foo')).toBe(6);
		expect(bulletCursorTarget('- [x] foo')).toBe(6);
		expect(bulletCursorTarget('  - [ ] foo')).toBe(8);
	});

	it('28. line start for other lines', () => {
		expect(bulletCursorTarget('foo')).toBe(0);
		expect(bulletCursorTarget('  foo')).toBe(0);
		expect(bulletCursorTarget('# heading')).toBe(0);
	});
});
