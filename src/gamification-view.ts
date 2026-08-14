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
    /** DOM refs for the writing-goal meter, cached so `updateTodayChars` can
     * patch it in place on routine writing ticks without a full re-render. */
    private todayCharsRefs: { section: HTMLElement; bar: HTMLElement; countEl: HTMLElement; labelEl: HTMLElement } | null = null;

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

    /**
     * Lightweight patch for routine writing-progress ticks — the word-count
     * stats file can update every ~400ms while actively typing, far too
     * often to justify tearing down and rebuilding the whole panel (which
     * also interrupts hover tooltips and badge-pop animations elsewhere on
     * the page). Updates just the writing-goal meter's bar width, count and
     * near-miss label in place. Returns false if the meter isn't currently
     * rendered (e.g. the goal was just turned on, or the panel was never
     * opened this session) so the caller can fall back to a full `refresh()`.
     */
    updateTodayChars(current: number, goal: number): boolean {
        if (!this.todayCharsRefs || goal <= 0) return false;
        const { section, bar, countEl, labelEl } = this.todayCharsRefs;

        countEl.setText(String(current));
        bar.style.width = `${Math.min(100, (current / goal) * 100)}%`;

        const remaining = goal - current;
        const nearMiss = remaining > 0 && remaining <= Math.max(1, goal * 0.1);
        section.toggleClass('is-near-miss', nearMiss);
        labelEl.setText(nearMiss ? `${remaining} TO GOAL` : '');

        return true;
    }

    /** Respect the OS/browser-level "reduce motion" preference for every animation in this view. */
    private prefersReducedMotion(): boolean {
        return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /** Animate a bar's fill from 0 to `pct`% so every update feels like it's "filling up". */
    private animateBar(fillEl: HTMLElement, pct: number) {
        if (this.prefersReducedMotion()) {
            fillEl.style.width = `${pct}%`;
            return;
        }
        fillEl.style.width = '0%';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fillEl.style.width = `${pct}%`;
            });
        });
    }

    /** Count a number up (or down) from `from` to `to` with an ease-out curve, instead of snapping. */
    private animateNumber(el: HTMLElement, from: number, to: number, duration = 500) {
        if (from === to || this.prefersReducedMotion()) {
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

    /**
     * TRIAL: using Obsidian's built-in `aria-label` tooltip instead of the
     * previous pure-CSS one, to check in practice whether it survives this
     * panel's frequent re-renders (every task completion tears down and
     * rebuilds the DOM, which could cut off a tooltip mid-hover — see git
     * history on this method for the earlier pure-CSS approach that avoided
     * that risk). Revert to the CSS approach if this turns out to glitch.
     */
    private attachTooltip(el: HTMLElement, text: string) {
        el.setAttr('aria-label', text);
        if (!el.hasAttribute('tabindex')) el.setAttr('tabindex', '0');
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
        this.renderTodayChars(container, snapshot);
        this.renderActivity(container, snapshot);
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
        label.createSpan({ cls: 'crystal-gv-level-title', text: ` · ${snapshot.levelTitle}` });

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
        const unit = metric === 'level' ? (remaining === 1 ? 'level' : 'levels')
            : metric === 'streak' ? (remaining === 1 ? 'day' : 'days')
                : 'chars';
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

    /**
     * Shared head row for a TODAY meter: icon + label on the left, the
     * animated "current / total" count on the right — used for both the task
     * meter and the writing-goal meter so they read as two peers, not one
     * primary metric with an oddly-labeled afterthought bolted on.
     */
    private renderMeterHead(container: HTMLElement, icon: string, label: string, current: number, prevCurrent: number, totalText: string): HTMLElement {
        const head = container.createDiv({ cls: 'crystal-gv-meter-head' });
        const labelEl = head.createSpan({ cls: 'crystal-gv-meter-label' });
        this.renderIcon(labelEl, icon);
        labelEl.createSpan({ text: ` ${label}` });
        const countEl = head.createSpan({ cls: 'crystal-gv-meter-count' });
        const currentEl = countEl.createSpan();
        this.animateNumber(currentEl, prevCurrent, current);
        countEl.createSpan({ text: ` ${totalText}` });
        return currentEl;
    }

    private renderTodayProgress(container: HTMLElement, snapshot: GamificationSnapshot) {
        container.createEl('div', { cls: 'crystal-gv-section-title', text: 'TODAY' });
        if (snapshot.todayProgress && snapshot.todayProgress.total > 0) {
            const { completed, total } = snapshot.todayProgress;
            const nearMiss = total - completed === 1;
            const section = container.createDiv({ cls: `crystal-gv-meter is-tasks${nearMiss ? ' is-near-miss' : ''}` });
            this.renderMeterHead(section, 'check-circle', 'Tasks', completed, this.previousSnapshot?.todayProgress?.completed ?? 0, `/ ${total}`);

            const barOuter = section.createDiv({ cls: 'crystal-gv-bar' });
            const barInner = barOuter.createDiv({ cls: 'crystal-gv-bar-fill' });
            this.animateBar(barInner, Math.min(100, (completed / total) * 100));

            if (nearMiss) {
                section.createEl('div', { cls: 'crystal-gv-near-miss-label', text: '1 TASK LEFT' });
            }
        } else {
            container.createEl('div', { cls: 'crystal-gv-level-sub', text: 'No tasks in today\'s daily note yet' });
        }
    }

    /**
     * Today's progress toward the daily writing goal (optional Better Word
     * Count integration) — same `.crystal-gv-meter` shape as the task meter
     * above it, so hitting either one reads as an equally valid way to keep
     * the streak alive.
     */
    private renderTodayChars(container: HTMLElement, snapshot: GamificationSnapshot) {
        this.todayCharsRefs = null;
        if (!snapshot.todayChars) return;
        const { current, goal } = snapshot.todayChars;
        const achieved = current >= goal;
        const remaining = goal - current;
        const nearMiss = !achieved && goal > 0 && remaining <= Math.max(1, goal * 0.1);

        const section = container.createDiv({ cls: `crystal-gv-meter is-chars${achieved ? ' is-achieved' : ''}${nearMiss ? ' is-near-miss' : ''}` });
        const countEl = this.renderMeterHead(section, 'pen-line', 'Writing', current, this.previousSnapshot?.todayChars?.current ?? 0, `/ ${goal} chars`);

        const barOuter = section.createDiv({ cls: 'crystal-gv-bar' });
        const barInner = barOuter.createDiv({ cls: 'crystal-gv-bar-fill' });
        this.animateBar(barInner, Math.min(100, (current / goal) * 100));

        const labelEl = section.createEl('div', { cls: 'crystal-gv-near-miss-label' });
        if (achieved) {
            labelEl.setText('GOAL MET');
        } else if (nearMiss) {
            labelEl.setText(`${remaining} TO GOAL`);
        } else {
            // Cache refs only in the routine (not-yet-achieved) state — once
            // achieved, further updates should go through a full refresh so
            // level-up/badge/streak side effects render correctly too.
            this.todayCharsRefs = { section, bar: barInner, countEl, labelEl };
        }
    }

    /**
     * One merged ACTIVITY section: the 7-day XP bar chart, a row of dots
     * underneath marking which of those days hit the writing goal (optional
     * Better Word Count integration), and the 30-day heatmap — previously
     * three visually separate blocks that all told some version of the same
     * "how active have I been lately" story.
     */
    private renderActivity(container: HTMLElement, snapshot: GamificationSnapshot) {
        container.createEl('div', { cls: 'crystal-gv-section-title', text: 'ACTIVITY' });

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

        const goal = snapshot.todayChars?.goal ?? 0;
        const showGoalMarkers = snapshot.charStatsAvailable && goal > 0 && snapshot.weeklyChars.length === snapshot.weeklyXP.length;
        if (showGoalMarkers) {
            const markerRow = container.createDiv({ cls: 'crystal-gv-activity-markers' });
            snapshot.weeklyChars.forEach((day) => {
                const hit = day.characters >= goal;
                const dot = markerRow.createSpan({ cls: `crystal-gv-activity-dot${hit ? ' is-hit' : ''}`, text: hit ? '✓' : '·' });
                this.attachTooltip(dot, `${day.date}: ${day.characters}/${goal} chars${hit ? ' — writing goal met' : ''}`);
            });
        }

        const maxMonthlyXP = Math.max(1, ...snapshot.monthlyXP.map((d) => d.xp));
        const grid = container.createDiv({ cls: 'crystal-gv-heatmap' });
        snapshot.monthlyXP.forEach((day) => {
            const level = day.xp === 0 ? 0 : Math.min(4, Math.ceil((day.xp / maxMonthlyXP) * 4));
            const cell = grid.createDiv({ cls: `crystal-gv-heatmap-cell is-level-${level}` });
            this.attachTooltip(cell, `${day.date}: ${day.xp} XP`);
        });
    }

    private renderLifetimeStats(container: HTMLElement, snapshot: GamificationSnapshot) {
        const el = container.createEl('div', { cls: 'crystal-gv-lifetime' });

        const tasksEl = el.createSpan();
        this.renderIcon(tasksEl, 'check-circle');
        const countEl = tasksEl.createSpan();
        this.animateNumber(countEl, this.previousSnapshot?.totalTasksCompleted ?? 0, snapshot.totalTasksCompleted);
        tasksEl.createSpan({ text: ' tasks' });

        if (snapshot.charStatsAvailable) {
            const charsEl = el.createSpan();
            this.renderIcon(charsEl, 'pen-line');
            const charsCountEl = charsEl.createSpan();
            this.animateNumber(charsCountEl, this.previousSnapshot?.lifetimeCharsWritten ?? 0, snapshot.lifetimeCharsWritten);
            charsEl.createSpan({ text: ' chars' });
        }

        if (snapshot.startDate) {
            const sinceEl = el.createSpan();
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
        if (snapshot.charStatsAvailable) {
            entries.push({ icon: 'pen-line', label: 'CHARS', value: snapshot.bestDayChars, unit: '' });
        }
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
