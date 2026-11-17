import { openSidebars, sidebarLevel } from '../src/features/workspace/sidebar-auto-toggle-logic';

describe('sidebarLevel', () => {
	it('closes both sidebars when only the editor fits', () => {
		expect(sidebarLevel(1199, 900, 300, 300)).toBe(0);
	});
	it('opens the left sidebar once editor + left fit', () => {
		expect(sidebarLevel(1200, 900, 300, 300)).toBe(1);
		expect(sidebarLevel(1499, 900, 300, 300)).toBe(1);
	});
	it('opens both once editor + left + right fit', () => {
		expect(sidebarLevel(1500, 900, 300, 300)).toBe(2);
	});
	it('uses each sidebar its own width', () => {
		expect(sidebarLevel(1300, 900, 400, 250)).toBe(1);
		expect(sidebarLevel(1550, 900, 400, 250)).toBe(2);
	});
});

describe('openSidebars', () => {
	it('opens the left sidebar first by default priority', () => {
		expect(openSidebars(0, 'left')).toEqual({ left: false, right: false });
		expect(openSidebars(1, 'left')).toEqual({ left: true, right: false });
		expect(openSidebars(2, 'left')).toEqual({ left: true, right: true });
	});
	it('opens the right sidebar first with right priority', () => {
		expect(openSidebars(1, 'right')).toEqual({ left: false, right: true });
		expect(openSidebars(2, 'right')).toEqual({ left: true, right: true });
	});
	it('matches the 700px example: left at 1000px, right at 1300px', () => {
		expect(openSidebars(sidebarLevel(999, 700, 300, 300), 'left')).toEqual({ left: false, right: false });
		expect(openSidebars(sidebarLevel(1000, 700, 300, 300), 'left')).toEqual({ left: true, right: false });
		expect(openSidebars(sidebarLevel(1300, 700, 300, 300), 'left')).toEqual({ left: true, right: true });
	});
});
