import { weekdayLabel } from '../src/features/daily-notes/weekday';
import { DEFAULT_SETTINGS } from '../src/settings';

const moment = jest.requireActual('moment');

describe('weekdayLabel', () => {
	const monday = moment('2026-09-21', 'YYYY-MM-DD').locale('en');

	it('formats the weekday with the default format', () => {
		expect(weekdayLabel(monday, DEFAULT_SETTINGS)).toBe('Monday');
	});

	it('uses the configured format', () => {
		expect(weekdayLabel(monday, { ...DEFAULT_SETTINGS, dailyNoteWeekdayFormat: '(ddd)' })).toBe('(Mon)');
	});

	it('falls back to the default format when the format is empty', () => {
		expect(weekdayLabel(monday, { ...DEFAULT_SETTINGS, dailyNoteWeekdayFormat: '' })).toBe('Monday');
	});

	it('returns null for non-daily notes', () => {
		expect(weekdayLabel(null, DEFAULT_SETTINGS)).toBeNull();
	});

	it('returns null when disabled', () => {
		expect(weekdayLabel(monday, { ...DEFAULT_SETTINGS, dailyNoteShowWeekday: false })).toBeNull();
	});
});
