export function splitByTimeline(content: string, heading: string): { before: string; timeline: string } {
    const lines = content.split('\n');
    const idx = lines.findIndex(line => line.trim() === heading.trim());
    if (idx === -1) {
        return { before: content, timeline: '' };
    }
    const before = lines.slice(0, idx).join('\n');
    const timeline = lines.slice(idx).join('\n');
    return { before, timeline };
}

function trimTrailingBlankLines(s: string): string {
    const lines = s.split('\n');
    let end = lines.length;
    while (end > 0 && lines[end - 1].trim() === '') {
        end--;
    }
    return lines.slice(0, end).join('\n');
}

export function recombineSections(before: string, timeline: string): string {
    const beforeTrimmed = trimTrailingBlankLines(before);
    const timelineTrimmed = trimTrailingBlankLines(timeline);

    if (beforeTrimmed.length === 0 && timelineTrimmed.length === 0) {
        return '';
    }

    if (timelineTrimmed.length === 0) {
        return beforeTrimmed.endsWith('\n') ? beforeTrimmed : `${beforeTrimmed}\n`;
    }

    if (beforeTrimmed.length === 0) {
        return timelineTrimmed.endsWith('\n') ? timelineTrimmed : `${timelineTrimmed}\n`;
    }

    return `${beforeTrimmed}\n\n${timelineTrimmed}\n`;
}
