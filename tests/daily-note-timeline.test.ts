import { extractHeadingSectionFromContent, filterTasksContent, filterTimelineContent } from '../src/daily-notes-timeline/filters';
import { extractDateFromFileName, toISODateKey } from '../src/daily-notes-timeline/data';

describe('daily note timeline filters', () => {
    test('filterTasksContent returns task lines only', () => {
        const input = [
            '# Title',
            '- [ ] Task one',
            'Paragraph',
            '- [x] Done',
            '- [ ] Task two',
        ].join('\n');

        expect(filterTasksContent(input)).toBe('- [ ] Task one\n- [x] Done\n- [ ] Task two');
    });

    test('filterTasksContent returns null when no tasks', () => {
        const input = ['# Title', 'Paragraph', '- item'].join('\n');
        expect(filterTasksContent(input)).toBeNull();
    });

    test('extractHeadingSectionFromContent matches heading text ignoring hashes', () => {
        const input = [
            '# One',
            'a',
            '## Target',
            'line 1',
            'line 2',
            '### Child',
            'line 3',
            '## Next',
            'line 4',
        ].join('\n');

        expect(extractHeadingSectionFromContent(input, 'Target')).toBe('line 1\nline 2\n### Child\nline 3');
    });

    test('extractHeadingSectionFromContent returns null when heading missing', () => {
        const input = ['# One', 'text'].join('\n');
        expect(extractHeadingSectionFromContent(input, 'Missing')).toBeNull();
    });

    test('filterTimelineContent respects heading filter', () => {
        const input = ['# A', 'text', '# B', 'b1'].join('\n');
        expect(filterTimelineContent(input, 'heading', 'B')).toBe('b1');
    });

    test('extractDateFromFileName supports separators and literals', () => {
        const date = extractDateFromFileName('2024.02.03 daily', 'YYYY.MM.DD [daily]');
        expect(date).not.toBeNull();
        expect(toISODateKey(date as Date)).toBe('2024-02-03');
    });

    test('extractDateFromFileName supports weekday tokens', () => {
        const date = extractDateFromFileName('2024-02-03 Sat', 'YYYY-MM-DD ddd');
        expect(date).not.toBeNull();
        expect(toISODateKey(date as Date)).toBe('2024-02-03');
    });
});
