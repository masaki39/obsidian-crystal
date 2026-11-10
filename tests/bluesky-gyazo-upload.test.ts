import { shouldUploadToGyazo } from '../src/features/bluesky/post-modal';

describe('shouldUploadToGyazo', () => {
	it('never uploads without a Gyazo service', () => {
		expect(shouldUploadToGyazo('bluesky', false, true)).toBe(false);
		expect(shouldUploadToGyazo('daily-note', false, false)).toBe(false);
	});

	it('uploads from the Bluesky window only while timeline appending is on', () => {
		expect(shouldUploadToGyazo('bluesky', true, false)).toBe(false);
		expect(shouldUploadToGyazo('bluesky', true, true)).toBe(true);
	});

	it('always uploads from the daily note window, where the URLs are used', () => {
		expect(shouldUploadToGyazo('daily-note', true, false)).toBe(true);
		expect(shouldUploadToGyazo('daily-note', true, true)).toBe(true);
	});
});
