import { Plugin } from 'obsidian';
import { CrystalPluginSettings } from './settings';

type PluginHost = Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

/** One status-bar item detected in the DOM, with a stable-ish identifying key. */
export interface StatusBarItemInfo {
	/** Identity used to persist ordering (e.g. `plugin-word-count`, or
	 * `plugin-foo#1` for a plugin's second item, or a class/text fallback). */
	key: string;
	/** Human-readable name for the settings UI. */
	label: string;
}

const GENERIC_CLASSES = new Set(['status-bar-item', 'mod-clickable']);

/** Class we toggle to hide an item. Kept separate from inline `display` so a
 * plugin's own show/hide logic on its item is untouched when we un-hide it. */
const HIDDEN_CLASS = 'crystal-status-bar-hidden';

/**
 * Obsidian gives no control over the order of status-bar items: the order is
 * just the order plugins happened to load in. `.status-bar` is a flexbox, so we
 * can reorder its children non-destructively by writing an inline `order` to
 * each `.status-bar-item` from a saved key list, and hide items by toggling a
 * class. A MutationObserver re-applies both whenever items are added or removed
 * (plugins that create their item lazily, or are toggled at runtime).
 */
export class StatusBarOrderService {
	private plugin: PluginHost;
	private statusBarEl: HTMLElement | null = null;
	private observer: MutationObserver | null = null;
	private reapplyTimer: number | null = null;

	constructor(plugin: PluginHost) {
		this.plugin = plugin;
	}

	onload() {
		this.plugin.app.workspace.onLayoutReady(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.statusBarEl = (this.plugin.app as any).statusBar?.containerEl
				?? document.body.querySelector('.status-bar');
			if (!this.statusBarEl) return;

			this.apply();

			this.observer = new MutationObserver(() => this.scheduleReapply());
			this.observer.observe(this.statusBarEl, { childList: true });
			this.plugin.register(() => this.observer?.disconnect());
		});
	}

	onunload() {
		this.observer?.disconnect();
		this.observer = null;
		if (this.reapplyTimer != null) window.clearTimeout(this.reapplyTimer);
		this.forEachItem(el => {
			el.style.removeProperty('order');
			el.classList.remove(HIDDEN_CLASS);
		});
	}

	/** Called from the plugin's saveSettings() after the order/hidden lists change. */
	updateSettings(settings: CrystalPluginSettings) {
		this.plugin.settings = settings;
		this.apply();
	}

	/** Snapshot of the current status-bar items, in DOM order. */
	detectItems(): StatusBarItemInfo[] {
		const seen = new Map<string, number>();
		const items: StatusBarItemInfo[] = [];
		this.forEachItem(el => {
			const key = this.itemKey(el, seen);
			items.push({ key, label: this.labelFor(key) });
		});
		return items;
	}

	private scheduleReapply() {
		if (this.reapplyTimer != null) window.clearTimeout(this.reapplyTimer);
		this.reapplyTimer = window.setTimeout(() => {
			this.reapplyTimer = null;
			this.apply();
		}, 50);
	}

	private apply() {
		if (!this.statusBarEl) return;
		const saved = this.plugin.settings.statusBarOrder ?? [];
		const hidden = new Set(this.plugin.settings.statusBarHidden ?? []);

		const rank = new Map<string, number>();
		saved.forEach((key, i) => rank.set(key, i));
		// Unknown items (not in the saved list) keep their relative DOM order,
		// placed after every item that IS ranked.
		const fallbackBase = saved.length;

		const seen = new Map<string, number>();
		let domIndex = 0;
		this.forEachItem(el => {
			const key = this.itemKey(el, seen);

			if (saved.length === 0) {
				el.style.removeProperty('order');
			} else {
				const ranked = rank.get(key);
				el.style.order = String(ranked !== undefined ? ranked : fallbackBase + domIndex);
			}

			el.classList.toggle(HIDDEN_CLASS, hidden.has(key));
			domIndex++;
		});
	}

	private forEachItem(fn: (el: HTMLElement) => void) {
		const bar = this.statusBarEl;
		if (!bar) return;
		bar.querySelectorAll<HTMLElement>(':scope > .status-bar-item').forEach(fn);
	}

	/** Derive a persistent key for one status-bar item element. */
	private itemKey(el: HTMLElement, seen: Map<string, number>): string {
		let base = '';
		el.classList.forEach(cls => {
			if (!base && cls.startsWith('plugin-') && cls.length > 'plugin-'.length) {
				base = cls;
			}
		});
		if (!base) {
			const specific = Array.from(el.classList)
				.filter(c => !GENERIC_CLASSES.has(c))
				.sort()
				.join('.');
			if (specific) {
				base = `class:${specific}`;
			} else {
				const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
				base = `text:${text.slice(0, 32)}`;
			}
		}
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		return n === 0 ? base : `${base}#${n}`;
	}

	/** Best-effort display name for a key, using plugin/core-plugin manifests. */
	private labelFor(key: string): string {
		const [rawBase, dupIndex] = key.split('#');
		let label = rawBase;
		if (rawBase.startsWith('plugin-')) {
			const id = rawBase.slice('plugin-'.length);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const app = this.plugin.app as any;
			const name = app.plugins?.manifests?.[id]?.name
				?? app.internalPlugins?.plugins?.[id]?.instance?.name
				?? id;
			label = name;
		} else if (rawBase.startsWith('class:')) {
			label = rawBase.slice('class:'.length);
		} else if (rawBase.startsWith('text:')) {
			label = `"${rawBase.slice('text:'.length)}"`;
		}
		return dupIndex ? `${label} (${Number(dupIndex) + 1})` : label;
	}
}
