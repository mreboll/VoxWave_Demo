import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PAPER_PAGE_COUNT, PAPER_PAGE_SIZE, PAPER_PDF_URL, paperPageUrl } from './paperAssets';

const PAGES = Array.from({ length: PAPER_PAGE_COUNT }, (_, i) => i + 1);
/** The first pages load straight away; the rest as the reader scrolls towards them. */
const EAGER_PAGES = 2;

/**
 * The paper as page images, for browsers that cannot show a PDF in a tab (D115). Nothing is downloaded unless
 * the reader asks for the PDF.
 */
export function Paper() {
  useEffect(() => {
    document.title = 'VoxWave · Research paper';
    return () => {
      document.title = 'VoxWave';
    };
  }, []);

  return (
    <div className="min-h-dvh bg-paper-shade">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-paper/90 px-4 py-2.5 shadow-card backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={22} />
          <span className="truncate text-sm font-medium text-ink-muted">Research paper</span>
        </div>
        <a
          href={PAPER_PDF_URL}
          download="VoxWave_paper.pdf"
          className="btn inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-semibold text-navy shadow-card ring-1 ring-ink-faint ring-inset"
        >
          <Download size={14} />
          Download PDF
        </a>
      </header>

      <main className="mx-auto flex max-w-[880px] flex-col gap-3 px-2 py-4 sm:gap-5 sm:px-6 sm:py-8">
        {PAGES.map((page) => (
          <img
            key={page}
            src={paperPageUrl(page)}
            width={PAPER_PAGE_SIZE.width}
            height={PAPER_PAGE_SIZE.height}
            loading={page <= EAGER_PAGES ? 'eager' : 'lazy'}
            alt={`Page ${page} of ${PAPER_PAGE_COUNT}`}
            className="h-auto w-full rounded-sm bg-white shadow-card"
          />
        ))}
      </main>
    </div>
  );
}
