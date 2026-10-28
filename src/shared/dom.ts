/** Whether the OS asks for reduced motion; animations should be skipped then. */
export function prefersReducedMotion(): boolean {
	return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
