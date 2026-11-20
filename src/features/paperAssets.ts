/**
 * The research paper (D115). `VoxWave_paper.pdf` is a copy of voxwave-research/paper/VoxWave_paper.pdf; the page
 * images are that PDF rendered to WebP at 1400 px wide. If the paper changes, copy the PDF and re-render them.
 *
 * The "Paper" link opens the page viewer (`/paper`), never the PDF itself: browsers without a PDF viewer download
 * it (Chrome on Android, embedded webviews), and some of those still report `navigator.pdfViewerEnabled`.
 */
export const PAPER_ROUTE = '/paper';
export const PAPER_PDF_URL = '/docs/VoxWave_paper.pdf';
export const PAPER_PAGE_COUNT = 14;
export const PAPER_PAGE_SIZE = { width: 1400, height: 1981 } as const;

export const paperPageUrl = (page: number): string =>
  `/docs/paper-pages/page-${String(page).padStart(2, '0')}.webp`;
