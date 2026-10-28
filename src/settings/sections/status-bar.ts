import { App, Setting, setIcon } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import type { StatusBarOrderService } from '../../features/workspace/status-bar-order';
import { sectionHeading } from '../components';

export function renderStatusBarSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Status bar', 'panel-bottom')
		.setDesc('Reorder or hide the items in Obsidian\'s status bar, including items from other plugins and core features. Items only appear here once the plugin that owns them has loaded, so open the vault fully before arranging. Items already hidden elsewhere (by their own plugin, a core setting, or a CSS snippet) can\'t be detected and won\'t be listed.');

	const listEl = containerEl.createDiv({ cls: 'crystal-status-bar-order' });
	renderStatusBarOrderList(listEl, plugin);

	new Setting(containerEl)
		.addButton(button => button
			.setButtonText('Rescan')
			.setTooltip('Refresh the list of detected status bar items')
			.onClick(() => renderStatusBarOrderList(listEl, plugin)))
		.addButton(button => button
			.setButtonText('Reset to default')
			.setWarning()
			.setTooltip('Clear all custom order and visibility')
			.onClick(async () => {
				plugin.settings.statusBarOrder = [];
				plugin.settings.statusBarHidden = [];
				await plugin.saveSettings();
				renderStatusBarOrderList(listEl, plugin);
			}));
}

function renderStatusBarOrderList(listEl: HTMLElement, plugin: CrystalPluginHost) {
	listEl.empty();

	const service = (plugin as unknown as { statusBarOrderService?: StatusBarOrderService }).statusBarOrderService;
	const detected = service ? service.detectItems() : [];
	const labelByKey = new Map(detected.map(item => [item.key, item.label]));
	const saved = plugin.settings.statusBarOrder ?? [];
	const hidden = new Set(plugin.settings.statusBarHidden ?? []);

	// Saved keys first (keeping ones whose plugin isn't loaded right now, so
	// the user doesn't lose their arrangement), then any newly-seen items.
	const orderedKeys = [
		...saved,
		...detected.filter(item => !saved.includes(item.key)).map(item => item.key),
	];

	if (orderedKeys.length === 0) {
		listEl.createDiv({ cls: 'crystal-status-bar-order-empty', text: 'No status bar items detected yet.' });
		return;
	}

	const commitOrder = async (keys: string[]) => {
		plugin.settings.statusBarOrder = keys;
		await plugin.saveSettings();
		renderStatusBarOrderList(listEl, plugin);
	};

	const toggleHidden = async (key: string) => {
		const next = new Set(plugin.settings.statusBarHidden ?? []);
		if (next.has(key)) next.delete(key); else next.add(key);
		plugin.settings.statusBarHidden = [...next];
		await plugin.saveSettings();
		renderStatusBarOrderList(listEl, plugin);
	};

	orderedKeys.forEach((key, index) => {
		const isHidden = hidden.has(key);
		const row = listEl.createDiv({ cls: 'crystal-status-bar-order-row', attr: { draggable: 'true' } });
		row.toggleClass('is-hidden', isHidden);

		const handle = row.createSpan({ cls: 'crystal-status-bar-order-handle' });
		setIcon(handle, 'grip-vertical');

		row.createSpan({ cls: 'crystal-status-bar-order-label', text: labelByKey.get(key) ?? key });
		if (!labelByKey.has(key)) {
			row.createSpan({ cls: 'crystal-status-bar-order-missing', text: 'not loaded' });
		}

		const move = async (to: number) => {
			if (to < 0 || to >= orderedKeys.length || to === index) return;
			const next = [...orderedKeys];
			const [moved] = next.splice(index, 1);
			next.splice(to, 0, moved);
			await commitOrder(next);
		};

		const visBtn = row.createEl('button', {
			cls: 'crystal-status-bar-order-btn clickable-icon',
			attr: { 'aria-label': isHidden ? 'Show item' : 'Hide item' },
		});
		setIcon(visBtn, isHidden ? 'eye-off' : 'eye');
		visBtn.addEventListener('click', () => toggleHidden(key));

		const up = row.createEl('button', { cls: 'crystal-status-bar-order-btn', text: '↑', attr: { 'aria-label': 'Move up' } });
		up.addEventListener('click', () => move(index - 1));
		const down = row.createEl('button', { cls: 'crystal-status-bar-order-btn', text: '↓', attr: { 'aria-label': 'Move down' } });
		down.addEventListener('click', () => move(index + 1));

		row.addEventListener('dragstart', (e) => {
			e.dataTransfer?.setData('text/plain', String(index));
			if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
			row.addClass('is-dragging');
		});
		row.addEventListener('dragend', () => row.removeClass('is-dragging'));
		row.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
			row.addClass('is-drop-target');
		});
		row.addEventListener('dragleave', () => row.removeClass('is-drop-target'));
		row.addEventListener('drop', async (e) => {
			e.preventDefault();
			row.removeClass('is-drop-target');
			const from = parseInt(e.dataTransfer?.getData('text/plain') ?? '', 10);
			if (!Number.isInteger(from) || from === index) return;
			const next = [...orderedKeys];
			const [moved] = next.splice(from, 1);
			next.splice(index, 0, moved);
			await commitOrder(next);
		});
	});
}
