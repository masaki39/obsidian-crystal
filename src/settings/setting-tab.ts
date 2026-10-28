import { App, type IconName, PluginSettingTab, SearchComponent, prepareSimpleSearch, setIcon } from 'obsidian';
import { renderPropertyColorSection } from '../features/properties/color-settings';
import { renderHackerModeSection } from '../features/hacker/settings-section';
import type { CrystalPluginHost } from '../types';
import { renderGeneralSection } from './sections/general';
import { renderEditorSection } from './sections/editor';
import { renderAiSection } from './sections/ai';
import { renderBlueskySection } from './sections/bluesky';
import { renderDailyNotesSection } from './sections/daily-notes';
import { renderGamificationSection } from './sections/gamification';
import { renderImageSection } from './sections/images';
import { renderMarpSection } from './sections/marp';
import { renderQuartzSection } from './sections/quartz';
import { renderPropertyLinkSection } from './sections/property-link';
import { renderStatusBarSection } from './sections/status-bar';
import { renderFileOrganizationSection } from './sections/file-rules';

/** One entry in the settings tab's own top navigation (unrelated to Obsidian's
 * left-hand settings sidebar). `render` paints that section's Settings into
 * whatever container it's given, so the same function doubles as this tab's
 * normal single-section view and as one chunk of the flattened search view. */
interface SettingsSection {
	id: string;
	label: string;
	icon: IconName;
	render: (containerEl: HTMLElement) => void;
}

export class CrystalSettingTab extends PluginSettingTab {
	plugin: CrystalPluginHost;

	/** Which of the top-nav sections is showing; persists for the lifetime of
	 * this tab instance so re-opening Settings returns to where you left off. */
	private activeSectionId = 'general';
	/** Live text of the search box; non-empty switches the content pane from
	 * "one section" to "every section, filtered". */
	private searchQuery = '';

	constructor(app: App, plugin: CrystalPluginHost) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Ordered list of top-nav sections. Each `render` reproduces exactly what
	 * used to be inlined in `display()`, just scoped to its own container so it
	 * can be shown alone (normal browsing) or alongside the others (search). */
	private getSections(): SettingsSection[] {
		return [
			{ id: 'general', label: 'General', icon: 'settings-2', render: (el) => renderGeneralSection(el, this.app, this.plugin) },
			{ id: 'editor', label: 'Editor', icon: 'list', render: (el) => renderEditorSection(el, this.app, this.plugin) },
			{ id: 'ai', label: 'AI', icon: 'bot', render: (el) => renderAiSection(el, this.app, this.plugin) },
			{ id: 'bluesky', label: 'Bluesky', icon: 'cloud', render: (el) => renderBlueskySection(el, this.app, this.plugin) },
			{ id: 'daily-notes', label: 'Daily notes', icon: 'calendar-days', render: (el) => renderDailyNotesSection(el, this.app, this.plugin) },
			{ id: 'gamification', label: 'Gamification', icon: 'gamepad-2', render: (el) => renderGamificationSection(el, this.app, this.plugin, () => this.display()) },
			{ id: 'images', label: 'Images', icon: 'image', render: (el) => renderImageSection(el, this.app, this.plugin) },
			{ id: 'marp', label: 'Marp', icon: 'presentation', render: (el) => renderMarpSection(el, this.app, this.plugin) },
			{ id: 'quartz', label: 'Quartz', icon: 'globe', render: (el) => renderQuartzSection(el, this.app, this.plugin) },
			{ id: 'property-link', label: 'Property link', icon: 'link', render: (el) => renderPropertyLinkSection(el, this.app, this.plugin) },
			{ id: 'property-colors', label: 'Property colors', icon: 'palette', render: (el) => renderPropertyColorSection(el, this.app, this.plugin) },
			{ id: 'hacker-mode', label: 'Hacker mode', icon: 'terminal', render: (el) => renderHackerModeSection(el, this.plugin) },
			{ id: 'status-bar', label: 'Status bar', icon: 'panel-bottom', render: (el) => renderStatusBarSection(el, this.app, this.plugin) },
			{ id: 'file-rules', label: 'File rules', icon: 'folder-tree', render: (el) => renderFileOrganizationSection(el, this.app, this.plugin) },
		];
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const sections = this.getSections();
		if (!sections.some(section => section.id === this.activeSectionId)) {
			this.activeSectionId = sections[0].id;
		}

		// Search box: filters across every section at once, regardless of the
		// active nav tab (matches how Obsidian's own Settings search works).
		const searchWrapper = containerEl.createDiv({ cls: 'crystal-settings-search' });
		const search = new SearchComponent(searchWrapper)
			.setPlaceholder('Search settings…')
			.setValue(this.searchQuery)
			.onChange((value) => {
				this.searchQuery = value;
				renderContent();
			});
		search.inputEl.addClass('crystal-settings-search-input');

		// Top nav: switches which single section is shown. Clicking a tab while
		// a search is active clears it, since a tab click means "browse this
		// section", not "keep filtering".
		const nav = containerEl.createDiv({ cls: 'crystal-settings-nav' });
		const tabButtons = new Map<string, HTMLElement>();
		sections.forEach(section => {
			const button = nav.createEl('button', { cls: 'crystal-settings-tab', text: section.label });
			const iconEl = createSpan({ cls: 'crystal-settings-tab-icon' });
			setIcon(iconEl, section.icon);
			button.prepend(iconEl);
			button.addEventListener('click', () => {
				this.activeSectionId = section.id;
				if (this.searchQuery) {
					this.searchQuery = '';
					search.setValue('');
				}
				renderContent();
			});
			tabButtons.set(section.id, button);
		});

		const contentEl = containerEl.createDiv({ cls: 'crystal-settings-content' });

		const renderContent = () => {
			const isSearching = !!this.searchQuery.trim();
			tabButtons.forEach((button, id) => {
				button.toggleClass('is-active', !isSearching && id === this.activeSectionId);
			});
			nav.toggleClass('is-searching', isSearching);

			contentEl.empty();
			if (isSearching) {
				sections.forEach(section => section.render(contentEl));
				this.applySearchFilter(contentEl, this.searchQuery);
			} else {
				const activeSection = sections.find(section => section.id === this.activeSectionId) ?? sections[0];
				activeSection.render(contentEl);
			}
		};

		renderContent();
	}

	/**
	 * Hides every rendered `.setting-item` whose visible text doesn't match
	 * `query`, and hides each section heading (`.setting-item-heading`, the
	 * class `Setting.setHeading()` applies) once none of the settings under it
	 * still match — so a search for e.g. "webp" shows only that one row, not
	 * the whole Image processor section.
	 */
	private applySearchFilter(containerEl: HTMLElement, query: string) {
		const search = prepareSimpleSearch(query.trim());
		let currentHeading: HTMLElement | null = null;
		let currentHeadingMatches = false;

		const closeHeading = () => {
			if (currentHeading) currentHeading.toggleClass('crystal-search-hidden', !currentHeadingMatches);
		};

		containerEl.querySelectorAll<HTMLElement>('.setting-item').forEach(item => {
			const isHeading = item.hasClass('setting-item-heading');
			const matches = !!search(item.textContent ?? '');
			if (isHeading) {
				closeHeading();
				currentHeading = item;
				currentHeadingMatches = matches;
				return;
			}
			item.toggleClass('crystal-search-hidden', !matches);
			if (matches) currentHeadingMatches = true;
		});
		closeHeading();
	}

}
