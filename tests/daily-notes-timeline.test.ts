import { recombineSections, splitByTimeline, transformBeforeTimeline } from '../src/features/daily-notes/timeline';
import { parseFrontmatter } from '../src/shared/markdown/frontmatter';

// The inline sequence transformBeforeTimeline replaced.
function reference(content: string, heading: string, transform: (before: string) => string): string {
	const { frontmatter, content: body } = parseFrontmatter(content);
	const { before, timeline } = splitByTimeline(body, heading);
	return `${frontmatter}${recombineSections(transform(before), timeline)}`;
}

describe('transformBeforeTimeline', () => {
	const heading = '# Time Line';
	const cases = [
		'---\ntags: [a]\n---\n- [ ] task\n\n# Time Line\n\n> entry\n',
		'- [x] done\n- [ ] todo\n',
		'# Time Line\n- 10:00 [[note]]\n',
		'',
		'---\nx: 1\n---\n',
	];

	it.each(cases)('matches the original inline sequence for %j', (content) => {
		const transform = (before: string) => `${before.trimEnd()}\n- 12:00 [[new]]`;
		expect(transformBeforeTimeline(content, heading, transform)).toBe(reference(content, heading, transform));
	});

	it('keeps frontmatter and timeline while rewriting the part above it', () => {
		const content = '---\ntags: [a]\n---\n- [ ] task\n\n# Time Line\n\n> entry\n';
		expect(transformBeforeTimeline(content, heading, (before) => before.toUpperCase()))
			.toBe('---\ntags: [a]\n---\n- [ ] TASK\n\n# Time Line\n\n> entry\n');
	});
});
