/**
 * Global Scroll Lock Manager
 * Prevents multiple/nested modals, drawers, and asynchronous unmounting from
 * leaving `document.body.style.overflow = 'hidden'`, which freezes window scrolling.
 */

let activeLocks = 0;

export function lockScroll() {
    if (typeof document === 'undefined') return;
    activeLocks++;
    if (activeLocks === 1) {
        document.body.style.overflow = 'hidden';
    }
}

export function unlockScroll() {
    if (typeof document === 'undefined') return;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
        document.body.style.overflow = '';
    }
}

export function forceUnlockScroll() {
    if (typeof document === 'undefined') return;
    activeLocks = 0;
    document.body.style.overflow = '';
}
