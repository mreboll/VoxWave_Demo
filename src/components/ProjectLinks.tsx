import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { FileText } from 'lucide-react';
import { springSoft } from '../design/motion';
import { PAPER_ROUTE } from '../features/paperAssets';

/** GitHub's mark (Octicons `mark-github`); lucide no longer ships brand icons. */
function GitHubMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

interface ProjectLink {
  label: string;
  /** Read by screen readers instead of the short visible label. */
  description: string;
  href: string;
  icon: ReactNode;
}

// Left to right, in the order the team asked for. The paper opens in the demo's own page viewer, so no browser
// downloads it (see paperAssets.ts).
const LINKS: readonly ProjectLink[] = [
  {
    label: 'Demo code',
    description: 'Demo source code on GitHub',
    href: 'https://github.com/mreboll/VoxWave_Demo',
    icon: <GitHubMark />,
  },
  {
    label: 'AI model',
    description: 'AI model repository on GitHub',
    href: 'https://github.com/mreboll/voxwave-research',
    icon: <GitHubMark />,
  },
  {
    label: 'Paper',
    description: 'Scientific paper (PDF)',
    href: PAPER_ROUTE,
    icon: <FileText size={20} strokeWidth={1.9} />,
  },
  {
    label: 'Landing page',
    description: 'Landing page repository on GitHub',
    href: 'https://github.com/MarcoGarLop/VoxWave_LandingPage',
    icon: <GitHubMark />,
  },
];

/** Icon links to the project's repositories and paper, shown at the top of the landing. */
export function ProjectLinks({ className = '' }: { className?: string }) {
  return (
    <motion.nav
      aria-label="Project resources"
      className={className}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: 0.5 }}
    >
      {/* Four 64 px items still fit a 320 px phone (D89) with the tight gap; it opens up from 400 px. */}
      <ul className="flex items-start justify-center gap-1 min-[400px]:gap-4 sm:gap-9">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.description} (opens in a new tab)`}
              className="group flex w-16 flex-col items-center gap-1.5 rounded-xl text-center sm:w-20"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-navy shadow-card ring-1 ring-ink-faint transition-transform ring-inset group-hover:-translate-y-0.5 group-hover:text-coral-strong sm:h-11 sm:w-11">
                {link.icon}
              </span>
              <span className="text-[11px] leading-tight font-medium text-ink-muted transition-colors group-hover:text-navy sm:text-xs">
                {link.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}
