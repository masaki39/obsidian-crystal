import { AbstractInputSuggest, App, ColorComponent, Setting, setIcon } from 'obsidian';
import type { CrystalPluginHost } from './types';
import { COLOR_PALETTES, type ColorPalette, getColorPalette, nextPaletteColor } from './property-color';

/** Names of every property known to the vault, for the name field's suggestions. */
function knownPropertyNames(app: App): string[] {
	// Not part of the public API; the suggestions are simply empty without it.
	const all = (app as any).metadataTypeManager?.getAllProperties?.() ?? {};
	return Object.values(all)
		.map((info: any) => String(info?.name ?? ''))
		.filter(name => name.length > 0)
		.sort((a, b) => a.localeCompare(b));
}

/**
 * Suggests vault property names for a comma-separated name field: only the
 * part after the last comma is completed, and names already listed are left out.
 */
class PropertyNameSuggest extends AbstractInputSuggest<string> {
	private inputEl: HTMLInputElement;
	private names: string[];

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.names = knownPropertyNames(app);
	}

	protected getSuggestions(query: string): string[] {
		const parts = query.split(',').map(part => part.trim().toLowerCase());
		const current = parts.pop() ?? '';
		const listed = new Set(parts);
		return this.names.filter(name => {
			const lower = name.toLowerCase();
			return !listed.has(lower) && lower !== current && lower.includes(current);
		});
	}

	renderSuggestion(name: string, el: HTMLElement) {
		el.setText(name);
	}

	selectSuggestion(name: string) {
		const listed = this.inputEl.value.split(',').slice(0, -1).map(part => part.trim()).filter(part => part.length > 0);
		this.setValue([...listed, name].join(', '));
		// Let the text component's onChange pick up the completed value.
		this.inputEl.dispatchEvent(new Event('input'));
		this.close();
	}
}

/**
 * Adds the palette swatches and a free color picker to a setting row, kept in
 * sync with each other. `onSync` runs whenever the shown color changes.
 */
function addColorControls(
	setting: Setting,
	palette: ColorPalette,
	getColor: () => string,
	setColor: (color: string) => Promise<void>,
	onSync?: (color: string) => void
): () => void {
	const swatches = new Map<string, HTMLElement>();
	let picker: ColorComponent | null = null;

	const sync = () => {
		const color = getColor().toLowerCase();
		swatches.forEach((el, swatchColor) => el.toggleClass('is-active', swatchColor === color));
		if (picker && color && picker.getValue().toLowerCase() !== color) {
			picker.setValue(color);
		}
		onSync?.(color);
	};

	const apply = async (color: string) => {
		if (color.toLowerCase() === getColor().toLowerCase()) {
			return;
		}
		await setColor(color);
		sync();
	};

	const swatchesEl = setting.controlEl.createDiv({ cls: 'crystal-color-swatches' });
	palette.colors.forEach(entry => {
		const swatch = swatchesEl.createEl('button', {
			cls: 'crystal-color-swatch',
			attr: { 'aria-label': `${entry.name} (${entry.color})` },
		});
		swatch.style.backgroundColor = entry.color;
		swatch.addEventListener('click', () => apply(entry.color));
		swatches.set(entry.color, swatch);
	});

	setting.addColorPicker(component => {
		picker = component;
		component.onChange(value => apply(value));
	});

	sync();
	return sync;
}

/** Settings section for per-property name colors (see `PropertyColorService`). */
export function renderPropertyColorSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const heading = new Setting(containerEl)
		.setName('Property colors')
		.setDesc('Give property names their own text color in the Properties editor, so important ones are easier to spot.')
		.setHeading();
	heading.settingEl.addClass('crystal-section-heading');
	const iconEl = createSpan({ cls: 'crystal-section-icon' });
	setIcon(iconEl, 'palette');
	heading.nameEl.prepend(iconEl);

	new Setting(containerEl)
		.setName('Color palette')
		.setDesc('Swatches offered for quick selection. Colors already chosen are not changed; the picker next to the swatches still accepts any color.')
		.addDropdown(dropdown => {
			COLOR_PALETTES.forEach(palette => dropdown.addOption(palette.id, palette.label));
			dropdown
				.setValue(getColorPalette(plugin.settings.propertyColorPalette).id)
				.onChange(async (value) => {
					plugin.settings.propertyColorPalette = value;
					await plugin.saveSettings();
					renderBody();
				});
		});

	const bodyEl = containerEl.createDiv({ cls: 'crystal-property-colors' });

	const renderBody = () => {
		bodyEl.empty();
		const settings = plugin.settings;
		const palette = getColorPalette(settings.propertyColorPalette);

		const defaultSetting = new Setting(bodyEl)
			.setName('All properties')
			.setDesc('Color for every property name that has no rule of its own below. Reset to keep the theme\'s color.');
		defaultSetting.settingEl.addClass('crystal-property-color-row');
		const syncDefault = addColorControls(
			defaultSetting,
			palette,
			() => settings.propertyColorDefault ?? '',
			async (color) => {
				settings.propertyColorDefault = color;
				await plugin.saveSettings();
			}
		);
		defaultSetting.addExtraButton(button => button
			.setIcon('rotate-ccw')
			.setTooltip('Reset to the theme\'s color')
			.onClick(async () => {
				settings.propertyColorDefault = '';
				await plugin.saveSettings();
				syncDefault();
			}));

		settings.propertyColors.forEach((rule, index) => {
			const setting = new Setting(bodyEl).setName(`Rule ${index + 1}`);
			setting.settingEl.addClass('crystal-property-color-row');
			let nameEl: HTMLInputElement | null = null;
			setting.addText(text => {
				text.setPlaceholder('status, priority')
					.setValue(rule.property)
					.onChange(async (value) => {
						rule.property = value.trim();
						await plugin.saveSettings();
					});
				text.inputEl.addClass('crystal-property-color-names');
				nameEl = text.inputEl;
				new PropertyNameSuggest(app, text.inputEl);
			});
			addColorControls(
				setting,
				palette,
				() => rule.color,
				async (color) => {
					rule.color = color;
					await plugin.saveSettings();
				},
				// The name field doubles as a live preview of the rule's color.
				(color) => nameEl?.style.setProperty('color', color)
			);
			setting.addExtraButton(button => button
				.setIcon('trash-2')
				.setTooltip('Delete rule')
				.onClick(async () => {
					settings.propertyColors.splice(index, 1);
					await plugin.saveSettings();
					renderBody();
				}));
		});

		new Setting(bodyEl)
			.setName('Add rule')
			.setDesc('One rule colors one or more properties: separate names with commas (e.g. status, priority). Names are not case-sensitive.')
			.addButton(button => button
				.setButtonText('Add')
				.setCta()
				.onClick(async () => {
					settings.propertyColors.push({ property: '', color: nextPaletteColor(palette, settings.propertyColors) });
					await plugin.saveSettings();
					renderBody();
					// Start typing the new rule's name right away.
					const inputs = bodyEl.querySelectorAll<HTMLInputElement>('.crystal-property-color-names');
					inputs[inputs.length - 1]?.focus();
				}));
	};

	renderBody();
}
