import { useEffect, useRef } from "react";

/**
 * Hook that detects clicks outside a referenced element and fires a callback.
 * Used by dropdown menus and popovers to close when clicking away.
 *
 * @param {Function} onClickOutside - callback when a click outside is detected
 * @param {boolean} active - whether the listener is active (e.g., menu is open)
 * @returns {React.RefObject} ref to attach to the dropdown container element
 */
export function useClickOutside(onClickOutside, active = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return;

    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClickOutside();
      }
    }

    // Delay binding so the opening click doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("touchstart", handleClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [onClickOutside, active]);

  return ref;
}
