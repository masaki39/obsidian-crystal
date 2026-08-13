import { ItemView, setIcon, WorkspaceLeaf } from 'obsidian';
import { GamificationSnapshot, VIEW_TYPE_GAMIFICATION } from './gamification';

export { VIEW_TYPE_GAMIFICATION };

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** XP remaining under this threshold is treated as a "near miss" — emphasized to nudge one more push. */
const NEAR_MISS_XP = 10;

/**
 * Sidebar view showing the full gamification picture: level/XP progress, the
 * nearest badge target, streak + freeze tokens, today's task progress, a
 * 7-day XP trend, lifetime stats, personal bests, and the badge collection.
 * The status bar stays a compact glance; this view is where the detail lives.
 */
export class GamificationView extends ItemView {
    private getSnapshot: () => GamificationSnapshot;
    /** Badge ids unlocked as of the previous render; null until the first render happens. */
    private previousUnlockedIds: Set<string> | null = null;
    /** Snapshot as of the previous render; null until the first render happens. Powers count-up animations. */
    private previousSnapshot: GamificationSnapshot | null = null;

    constructor(leaf: WorkspaceLeaf, getSnapshot: () => GamificationSnapshot) {
        super(leaf);
        this.getSnapshot = getSnapshot;
    }

    getViewType(): string {
        return VIEW_TYPE_GAMIFICATION;
    }

    getDisplayText(): string {
        return 'Gamification';
    }

    getIcon(): string {
        return 'gamepad-2';
    }

    async onOpen() {
        this.render();
    }

    /** Called by GamificationManager whenever XP/streak/badges change. */
    refresh() {
        this.render();
    }

    /** Animate a bar's fill from 0 to `pct`% so every update feels like it's "filling up". */
    private animateBar(fillEl: HTMLElement, pct: number) {
        fillEl.style.width = '0%';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fillEl.style.width = `${pct}%`;
            });
        });
    }

    /** Count a number up (or down) from `from` to `to` with an ease-out curve, instead of snapping. */
    private animateNumber(el: HTMLElement, from: number, to: number, duration = 500) {
        if (from === to) {
            el.setText(String(to));
            return;
        }
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            el.setText(String(Math.round(from + (to - from) * eased)));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /** Attach a pure-CSS hover tooltip (no reliance on native title timing or Obsidian's tooltip manager,
     * both of which can get cancelled if this panel re-renders while the mouse is hovering). */
    private attachTooltip(el: HTMLElement, text: string) {
        el.addClass('crystal-gv-has-tooltip');
        el.setAttr('data-tooltip', text);
    }

    /** A small Lucide icon, sized to the surrounding text via CSS (em units). */
    private renderIcon(parent: HTMLElement, name: string, cls = 'crystal-gv-icon') {
        const el = parent.createSpan({ cls });
        setIcon(el, name);
        return el;
    }

    private render() {
        const container = this.contentEl;
        container.empty();
        container.addClass('crystal-gamification-view');

        const snapshot = this.getSnapshot();

        if (!snapshot.enabled) {
            container.createEl('p', {
                cls: 'crystal-gv-disabled',
                text: 'Gamification is off. Enable it in Crystal settings.',
            });
            this.previousSnapshot = null;
            return;
        }

        this.renderLevel(container, snapshot);
        this.renderNearestBadge(container, snapshot);
        this.renderStreak(container, snapshot);
        this.renderTodayProgress(container, snapshot);
        this.renderWeeklyXP(container, snapshot);
        this.renderLifetimeStats(container, snapshot);
        this.renderPersonalBests(container, snapshot);
        this.renderBadges(container, snapshot);

        this.previousUnlockedIds = new Set(snapshot.badges.filter((b) => b.unlocked).map((b) => b.id));
        this.previousSnapshot = snapshot;
    }

    private renderLevel(container: HTMLElement, snapshot: GamificationSnapshot) {
        const prev = this.previousSnapshot;
        const leveledUp = prev !== null && prev.level !== snapshot.level;
        const remainingXP = snapshot.xpForNextLevel - snapshot.xpIntoLevel;
        const nearMiss = remainingXP > 0 && remainingXP <= NEAR_MISS_XP;

        const levelSection = container.createDiv({ cls: `crystal-gv-level${nearMiss ? ' is-near-miss' : ''}` });
        const label = levelSection.createDiv({ cls: 'crystal-gv-level-label' });
        this.renderIcon(label, 'zap');
        label.createSpan({ text: `LEVEL ${snapshot.level}` });

        const barOuter = levelSection.createDiv({ cls: 'crystal-gv-bar' });
        const barInner = barOuter.createDiv({ cls: 'crystal-gv-bar-fill' });
        const pct = snapshot.xpForNextLevel > 0 ? Math.min(100, (snapshot.xpIntoLevel / snapshot.xpForNextLevel) * 100) : 0;
        if (pct >= 90) barInner.addClass('is-almost-there');
        this.animateBar(barInner, pct);

        const sub = levelSection.createEl('div', { cls: 'crystal-gv-level-sub' });
        const xpIntoEl = sub.createSpan();
        this.animateNumber(xpIntoEl, leveledUp ? snapshot.xpIntoLevel : (prev?.xpIntoLevel ?? 0), snapshot.xpIntoLevel);
        sub.createSpan({ text: ` / ${snapshot.xpForNextLevel} XP  ·  ` });
        const totalXpEl = sub.createSpan();
        this.animateNumber(totalXpEl, prev?.totalXP ?? 0, snapshot.totalXP);
        sub.createSpan({ text: ' total' });

        if (nearMiss) {
            levelSection.createEl('div', { cls: 'crystal-gv-near-miss-label', text: `${remainingXP} XP TO LEVEL UP` });
        }
    }

    /** The "next goal" callout — visualizes anticipation, not just the payoff. */
    private renderNearestBadge(container: HTMLElement, snapshot: GamificationSnapshot) {
        if (!snapshot.nearestBadge) return;
        const { badge, remaining, metric } = snapshot.nearestBadge;
        const unit = metric === 'level' ? (remaining === 1 ? 'level' : 'levels') : (remaining === 1 ? 'day' : 'days');
        const nearMiss = remaining <= 1;
        const target = container.createDiv({ cls: `crystal-gv-next-target${nearMiss ? ' is-near-miss' : ''}` });
        this.renderIcon(target, 'target', 'crystal-gv-next-target-icon');
        const textEl = target.createSpan();
        textEl.createSpan({ cls: 'crystal-gv-next-target-label', text: 'NEXT ' });
        this.renderIcon(textEl, badge.icon);
        textEl.createSpan({ text: ` ${badge.name} · ${remaining} ${unit}` });
    }

    private renderStreak(container: HTMLElement, snapshot: GamificationSnapshot) {
        const streakSection = container.createDiv({ cls: 'crystal-gv-streak' });

        const streakEl = streakSection.createSpan();
        this.renderIcon(streakEl, 'flame');
        streakEl.createSpan({ text: `${snapshot.streak}` });

        const freezeEl = streakSection.createSpan({ cls: 'crystal-gv-freeze' });
        this.renderIcon(freezeEl, 'snowflake');
        freezeEl.createSpan({ text: `${snapshot.freezeTokensAvailable}` });
        this.attachTooltip(
            freezeEl,
            'Freeze: skip a missed day without breaking your streak. Refills to 2 each month.'
        );

        if (snapshot.freezeTokenLog.length > 0) {
            const recent = snapshot.freezeTokenLog.slice(-3).reverse().join(', ');
            container.createEl('div', {
                cls: 'crystal-gv-freeze-log',
                text: `Freeze used: ${recent}`,
            });
        }
    }

    private renderTodayProgress(container: HTMLElement, snapshot: GamificationSnapshot) {
        container.createEl('div', { cls: 'crystal-gv-section-title', text: 'TODAY' });
        if (snapshot.todayProgress && snapshot.todayProgress.total > 0) {
            const { completed, total } = snapshot.todayProgress;
            const nearMiss = total - completed === 1;
            const todaySection = container.createDiv({ cls: `crystal-gv-today${nearMiss ? ' is-near-miss' : ''}` });
            const todayBarOuter = todaySection.createDiv({ cls: 'crystal-gv-bar' });
            const todayBarInner = todayBarOuter.createDiv({ cls: 'crystal-gv-bar-fill' });
            this.animateBar(todayBarInner, Math.min(100, (completed / total) * 100));

            const sub = todaySection.createEl('div', { cls: 'crystal-gv-level-sub' });
            const prevCompleted = this.previousSnapshot?.todayProgress?.completed ?? 0;
            const completedEl = sub.createSpan();
            this.animateNumber(completedEl, prevCompleted, completed);
            sub.createSpan({ text: ` / ${total} tasks` });

            if (nearMiss) {
                todaySection.createEl('div', { cls: 'crystal-gv-near-miss-label', text: '1 TASK LEFT' });
            }
        } else {
            container.createEl('div', { cls: 'crystal-gv-level-sub', text: 'No tasks in today\'s daily note yet' });
        }
    }

    private renderWeeklyXP(container: HTMLElement, snapshot: GamificationSnapshot) {
        container.createEl('div', { cls: 'crystal-gv-section-title', text: '7-DAY XP' });
        const maxXP = Math.max(1, ...snapshot.weeklyXP.map((d) => d.xp));
        const chart = container.createDiv({ cls: 'crystal-gv-chart' });
        snapshot.weeklyXP.forEach((day, index) => {
            const isToday = index === snapshot.weeklyXP.length - 1;
            const col = chart.createDiv({ cls: `crystal-gv-chart-col${isToday ? ' is-today' : ''}` });
            const barWrap = col.createDiv({ cls: 'crystal-gv-chart-bar-wrap' });
            const bar = barWrap.createDiv({ cls: 'crystal-gv-chart-bar' });
            const heightPct = Math.max(4, (day.xp / maxXP) * 100);
            bar.style.height = `${heightPct}%`;
            this.attachTooltip(bar, `${day.date}${isToday ? ' (today)' : ''}: ${day.xp} XP`);
            const weekday = WEEKDAY_LABELS[new Date(`${day.date}T00:00:00Z`).getUTCDay()];
            col.createDiv({ cls: 'crystal-gv-chart-label', text: weekday });
        });
    }

    private renderLifetimeStats(container: HTMLElement, snapshot: GamificationSnapshot) {
        const el = container.createEl('div', { cls: 'crystal-gv-lifetime' });

        const tasksEl = el.createSpan();
        this.renderIcon(tasksEl, 'check-circle');
        const countEl = tasksEl.createSpan();
        this.animateNumber(countEl, this.previousSnapshot?.totalTasksCompleted ?? 0, snapshot.totalTasksCompleted);
        tasksEl.createSpan({ text: ' tasks' });

        if (snapshot.startDate) {
            const sinceEl = el.createSpan({ cls: 'crystal-gv-since' });
            this.renderIcon(sinceEl, 'calendar');
            sinceEl.createSpan({ text: ` since ${snapshot.startDate}` });
        }
    }

    /** Personal-best records — the SNS "compare to others" idea, translated to "compare to your past self". */
    private renderPersonalBests(container: HTMLElement, snapshot: GamificationSnapshot) {
        container.createEl('div', { cls: 'crystal-gv-section-title', text: 'BEST' });
        const grid = container.createDiv({ cls: 'crystal-gv-best-grid' });

        const entries: { icon: string; label: string; value: number; unit: string }[] = [
            { icon: 'flame', label: 'STREAK', value: snapshot.bestStreak, unit: 'd' },
            { icon: 'list-checks', label: 'DAY', value: snapshot.bestDayTasks, unit: '' },
            { icon: 'zap', label: 'WEEK', value: snapshot.bestWeekXP, unit: 'xp' },
        ];
        for (const entry of entries) {
            const cell = grid.createDiv({ cls: 'crystal-gv-best' });
            this.renderIcon(cell, entry.icon, 'crystal-gv-best-icon');
            const valueEl = cell.createDiv({ cls: 'crystal-gv-best-value' });
            valueEl.createSpan({ text: `${entry.value}` });
            if (entry.unit) valueEl.createSpan({ cls: 'crystal-gv-best-unit', text: entry.unit });
            cell.createDiv({ cls: 'crystal-gv-best-label', text: entry.label });
        }
    }

    private renderBadges(container: HTMLElement, snapshot: GamificationSnapshot) {
        const unlockedCount = snapshot.badges.filter((b) => b.unlocked).length;
        container.createEl('div', { cls: 'crystal-gv-section-title', text: `BADGES ${unlockedCount}/${snapshot.badges.length}` });
        const grid = container.createDiv({ cls: 'crystal-gv-badge-grid' });
        snapshot.badges.forEach((badge, index) => {
            const isNewlyUnlocked = badge.unlocked && this.previousUnlockedIds !== null && !this.previousUnlockedIds.has(badge.id);
            const classes = ['crystal-gv-badge', badge.unlocked ? 'is-unlocked' : 'is-locked'];
            if (isNewlyUnlocked) classes.push('just-unlocked');

            const cell = grid.createDiv({ cls: classes.join(' ') });
            cell.style.animationDelay = `${index * 25}ms`;

            // Hidden badges give no hint at all until unlocked — a surprise to discover,
            // unlike regular locked badges which reveal their requirement on hover.
            const isUndiscoveredSecret = !badge.unlocked && badge.hidden;

            this.renderIcon(cell, badge.unlocked ? badge.icon : isUndiscoveredSecret ? 'help-circle' : 'lock', 'crystal-gv-badge-icon');
            cell.createDiv({
                cls: 'crystal-gv-badge-name',
                text: badge.unlocked ? badge.name : '???',
            });
            this.attachTooltip(
                cell,
                badge.unlocked
                    ? `${badge.name}: ${badge.description}`
                    : isUndiscoveredSecret
                        ? 'Undiscovered badge — condition unknown.'
                        : `Locked: ${badge.description}`
            );
        });
    }
}
