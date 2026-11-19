import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { MotionConfig } from 'motion/react';
import { useAppStore } from '../data/store';
import { router } from './router';

export function App() {
  // "system" follows prefers-reduced-motion; the demo panel can force reduced motion (D72).
  const motion = useAppStore((s) => s.motion);
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', motion === 'reduce');
  }, [motion]);
  return (
    <MotionConfig reducedMotion={motion === 'reduce' ? 'always' : 'user'}>
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
