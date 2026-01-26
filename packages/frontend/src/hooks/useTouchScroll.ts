import { useEffect, useRef } from 'react';

/**
 * Hook to enable touch scrolling on elements that don't scroll natively
 * Works around Chromium/Wayland touch scrolling issues on Raspberry Pi
 */
export function useTouchScroll(containerRef: React.RefObject<HTMLElement | null>) {
  const touchStartY = useRef(0);
  const scrollStartY = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      scrollStartY.current = container.scrollTop;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const diff = touchStartY.current - touchY;
      container.scrollTop = scrollStartY.current + diff;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef]);
}

/**
 * Global touch scroll enabler - call once at app level
 * Enables touch scrolling on the main content area
 */
export function enableGlobalTouchScroll() {
  let touchStartY = 0;
  let scrollStartY = 0;
  let activeScrollElement: HTMLElement | null = null;

  const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
    while (el) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return document.querySelector('.app-main') as HTMLElement;
  };

  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    activeScrollElement = findScrollableParent(target);
    if (activeScrollElement) {
      touchStartY = e.touches[0].clientY;
      scrollStartY = activeScrollElement.scrollTop;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!activeScrollElement) return;
    const touchY = e.touches[0].clientY;
    const diff = touchStartY - touchY;
    activeScrollElement.scrollTop = scrollStartY + diff;
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });

  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
  };
}
