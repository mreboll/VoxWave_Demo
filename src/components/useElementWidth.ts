import { useLayoutEffect, useRef, useState } from 'react';

/** Width of an element, kept current with a ResizeObserver (charts draw in real pixels, not stretched). */
export function useElementWidth<T extends HTMLElement>(initial = 0) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
