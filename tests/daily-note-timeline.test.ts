import { extractHeadingSectionFromContent, filterTasksContent, filterTimelineContent } from '../src/daily-notes-timeline/filters';
import { collectDailyNoteFiles, extractDateFromFileName, toISODateKey } from '../src/daily-notes-timeline/data';
import { mapTaskLineIndices } from '../src/daily-notes-timeline/view/tasks';
import { TFile } from 'obsidian';

class MockFile extends TFile {
    path: string;
    extension: string;
    basename: string;

    constructor(path: string) {
        super();
        this.path = path;
        const parts = path.split('/');
        const filename = parts[parts.length - 1];
        const dotIndex = filename.lastIndexOf('.');
        this.extension = dotIndex === -1 ? '' : filename.slice(dotIndex + 1);
        this.basename = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
    }
}

const createAppWithFiles = (paths: string[]) => {
    const files = paths.map(path => new MockFile(path));
    return {
        vault: {
            getFiles: () => files
        }
    } as any;
};

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

describe('daily note timeline task mapping', () => {
    test('maps task lines included by link filter', () => {
        const content = [
            '# Log',
            '- [ ] [[Project]] review',
            '- [ ] no link',
            'text',
            '- [x] https://example.com done',
        ].join('\n');

        const filtered = filterTimelineContent(content, 'links', '') ?? '';
        const indices = mapTaskLineIndices(content, filtered);

        expect(indices).toEqual([1, 4]);
    });

    test('maps task lines inside heading section', () => {
        const content = [
            '# One',
            '- [ ] outside',
            '## Target',
            '- [ ] inside one',
            '- [x] inside two',
            '## Next',
            '- [ ] outside two',
        ].join('\n');

        const filtered = filterTimelineContent(content, 'heading', 'Target') ?? '';
        const indices = mapTaskLineIndices(content, filtered);

        expect(indices).toEqual([3, 4]);
    });
});

describe('daily note timeline file collection', () => {
    test('collectDailyNoteFiles filters folder and sorts by date descending', () => {
        const app = createAppWithFiles([
            'Daily/2024-02-03.md',
            'Daily/2024-02-01.md',
            'Daily/2024-02-02.md',
            'Daily/notes.md',
            'Notes/2024-02-04.md',
            'Daily/2024-02-03.txt'
        ]);
        const files = collectDailyNoteFiles(app, { folder: 'Daily', format: 'YYYY-MM-DD' });
        expect(files.map(file => file.path)).toEqual([
            'Daily/2024-02-03.md',
            'Daily/2024-02-02.md',
            'Daily/2024-02-01.md'
        ]);
    });

    test('collectDailyNoteFiles respects root folder setting', () => {
        const app = createAppWithFiles([
            '2024-01-01.md',
            'Daily/2024-01-02.md',
            '2024-01-03.md'
        ]);
        const files = collectDailyNoteFiles(app, { folder: '', format: 'YYYY-MM-DD' });
        expect(files.map(file => file.path)).toEqual([
            '2024-01-03.md',
            '2024-01-01.md'
        ]);
    });
});
