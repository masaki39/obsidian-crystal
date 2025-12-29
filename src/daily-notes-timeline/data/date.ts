export function toISODateKey(date: Date): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getDateFromKey(key: string): Date {
    const [year, month, day] = key.split('-').map(value => parseInt(value, 10));
    return new Date(year, month - 1, day);
}

export function extractDateFromFileName(fileName: string, format: string): Date | null {
    const regexPattern = format
        .replace('YYYY', '(\\d{4})')
        .replace('MM', '(\\d{2})')
        .replace('DD', '(\\d{2})');
    const regex = new RegExp(regexPattern);
    const match = fileName.match(regex);
    if (!match) {
        return null;
    }
    const [, year, month, day] = match;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
}
