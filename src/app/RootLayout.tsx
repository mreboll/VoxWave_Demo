import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { DemoPanel } from '../demo/DemoPanel';

/** Wraps every route so the hidden demo panel (Shift + D) is available on any page, in either window. */
export function RootLayout() {
  // Warm every page chunk once the first screen is up, so no stage navigation waits for a download (D70).
  useEffect(() => {
    const preload = () => import('./router').then(({ pages }) => Object.values(pages).forEach((load) => void load()));
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(preload, { timeout: 2500 });
    else window.setTimeout(preload, 1200);
  }, []);

  return (
    <>
      <Outlet />
      <DemoPanel />
    </>
  );
}
