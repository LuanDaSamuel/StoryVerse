/**
 * Utility to rate-limit / debounce the Space key in editable areas.
 * Prevents accidental double-clicks / key chatter / rapid double-taps on the spacebar
 * by enforcing a minimum interval (cooldown) between consecutive space presses.
 * When typing regular words, typing any intervening character key resets the consecutive
 * count so normal typing speed is 100% unaffected.
 */

// Cooldown in milliseconds between consecutive space presses.
// ~260ms enforces that typing the space key consecutively is done "a bit slower",
// preventing accidental double clicks or hardware key chatter.
export const SPACE_KEY_COOLDOWN_MS = 260;

export function initSpaceRateLimiter(cooldownMs: number = SPACE_KEY_COOLDOWN_MS): () => void {
    let lastSpaceTime = 0;
    let consecutiveSpaceCount = 0;
    let lastTarget: EventTarget | null = null;

    const resetConsecutive = () => {
        consecutiveSpaceCount = 0;
        lastSpaceTime = 0;
        lastTarget = null;
    };

    const isEditableElement = (el: EventTarget | null): boolean => {
        if (!el || !(el instanceof HTMLElement)) return false;
        if (el.isContentEditable) return true;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
        if (typeof el.closest === 'function' && el.closest('[contenteditable="true"]')) return true;
        return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        // Only monitor editable areas (contentEditable, input, textarea)
        if (!isEditableElement(e.target)) {
            return;
        }

        const isSpace = e.key === ' ' || e.code === 'Space' || e.keyCode === 32;

        // Ignore IME composition or modifier combinations (e.g. Ctrl+Space)
        if (e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        if (!isSpace) {
            // Non-space key was pressed.
            // Ignore standalone modifier keys so pressing/releasing Shift doesn't reset context
            const isModifierOnly = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key);
            if (!isModifierOnly) {
                resetConsecutive();
            }
            return;
        }

        // It is a Space key
        const now = performance.now();
        const isSameTarget = e.target === lastTarget;
        const timeSinceLastSpace = now - lastSpaceTime;

        // If it's the very first space (e.g. after typing a word or fresh focus), allow immediately
        if (consecutiveSpaceCount === 0 || !isSameTarget) {
            consecutiveSpaceCount = 1;
            lastSpaceTime = now;
            lastTarget = e.target;
            return;
        }

        // It is a consecutive space on the same target (or auto-repeat)
        if (timeSinceLastSpace < cooldownMs) {
            // Suppress rapid double click / chatter / fast repeat
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }

        // If enough time has elapsed (typed "a bit slower"), allow it
        consecutiveSpaceCount++;
        lastSpaceTime = now;
        lastTarget = e.target;
    };

    const handlePointerOrFocus = () => {
        resetConsecutive();
    };

    // Attach using capture phase so it intercepts before browser default or element handlers
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('pointerdown', handlePointerOrFocus, true);
    window.addEventListener('blur', handlePointerOrFocus, true);

    return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('pointerdown', handlePointerOrFocus, true);
        window.removeEventListener('blur', handlePointerOrFocus, true);
    };
}
