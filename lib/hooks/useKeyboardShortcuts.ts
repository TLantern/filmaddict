import { useEffect, useCallback } from 'react';

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutConfig {
  key: string;
  meta?: boolean; // Cmd on Mac
  ctrl?: boolean; // Ctrl on Windows/Linux
  shift?: boolean;
  alt?: boolean; // Option/Alt
  handler: ShortcutHandler;
  preventDefault?: boolean;
}

const isMac = typeof window !== 'undefined' && (
  navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
);

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      // Allow certain shortcuts to work even in inputs (like Escape)
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Check each shortcut
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      if (!keyMatch) continue;

      // Check modifiers
      // On Mac: meta means Cmd (metaKey), on Windows: meta means Ctrl (ctrlKey)
      const wantsMeta = shortcut.meta === true;
      const wantsCtrl = shortcut.ctrl === true;
      const wantsShift = shortcut.shift === true;
      const wantsAlt = shortcut.alt === true;

      // Check meta: On Mac check metaKey, on Windows check ctrlKey (but only if not also wanting ctrl)
      let metaMatch = true;
      if (wantsMeta) {
        if (isMac) {
          metaMatch = event.metaKey && !event.ctrlKey; // Cmd pressed, Ctrl not
        } else {
          metaMatch = event.ctrlKey && !wantsCtrl; // Ctrl pressed (as meta), but only if not also wanting ctrl
        }
      } else {
        // Don't want meta - make sure it's not pressed
        if (isMac) {
          metaMatch = !event.metaKey; // Cmd not pressed
        } else {
          // On Windows, meta is ctrl, so only fail if ctrl is pressed AND we don't want ctrl either
          if (!wantsCtrl) metaMatch = !event.ctrlKey;
        }
      }

      // Check ctrl: Always check ctrlKey
      let ctrlMatch = true;
      if (wantsCtrl) {
        ctrlMatch = event.ctrlKey;
        // On Mac, make sure meta is not pressed (they're separate)
        if (isMac && event.metaKey) ctrlMatch = false;
      } else if (!wantsMeta) {
        // Don't want ctrl and don't want meta
        // On Windows, if we don't want meta (ctrl), ctrlKey shouldn't be pressed
        // On Mac, ctrlKey can be pressed independently
        if (!isMac) ctrlMatch = !event.ctrlKey;
        // On Mac, allow ctrlKey to be pressed (it's separate)
      }

      // Check shift
      const shiftMatch = shortcut.shift === undefined || event.shiftKey === wantsShift;

      // Check alt
      const altMatch = shortcut.alt === undefined || event.altKey === wantsAlt;

      // Check if all conditions match
      if (metaMatch && ctrlMatch && shiftMatch && altMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler(event);
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export { isMac };

