import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { TrendChart } from '../../components/charts/TrendChart';
import { StatusChip } from '../../components/StatusChip';
import { usePatient } from '../../data/store';
import { CLINICIAN, weekKeys } from '../../data/seed';
import { formatDay, formatSessionTime, isSameLocalDay } from '../../data/dates';
import { BIOMARKERS, deltaLevel, formatDelta, formatMetric } from '../../data/biomarkers';
import { patientNumber, qualityFlags, reportSummary } from '../../data/clinicText';
import { springSoft } from '../../design/motion';
import { now as clockNow } from '../../data/clock';

const LEVEL_TEXT = { steady: 'text-teal', watch: 'text-watch-ink', alert: 'text-coral-ink' } as const;
const LEVEL_DOT = { steady: 'bg-teal', watch: 'bg-watch', alert: 'bg-coral' } as const;

/** "One clear page" before each check-up (brief §7.4). A4-proportioned, prints via window.print(). */
export function Report() {
  const { id } = useParams();
  const { patient: p, sessions } = usePatient(id);

  useEffect(() => {
    if (p) document.title = `VoxWave report · ${p.name}`;
    return () => {
      document.title = 'VoxWave';
    };
  }, [p]);

  if (!p) {
    return (
      <div className="py-24 text-center text-ink-muted">
        Patient not found. <Link to="/clinic/dashboard" className="font-semibold text-coral-ink">Back to dashboard</Link>
        <PrototypeFooter className="mt-8" />
      </div>
    );
  }

  const now = clockNow();
  const weeks = weekKeys(now);
  const periodStart = new Date(`${weeks[0]}T12:00:00`);
  const inPeriod = sessions.filter((s) => new Date(s.startedAt) >= periodStart);
  const last = sessions.at(-1);
  const latestLabel = last && isSameLocalDay(new Date(last.startedAt), now) ? 'Today' : last ? formatDay(last.startedAt) : 'Latest';

  return (
    <div className="report-root min-h-dvh pb-16">
      <div className="no-print sticky top-0 z-20 border-b border-ink-faint bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-3">
          <Link
            to={`/clinic/patients/${p.id}`}
            className="btn -ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-ink-muted"
          >
            <ArrowLeft size={15} />
            {p.name}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-press inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            <Printer size={16} />
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto px-4 pt-8 print:overflow-visible print:p-0">
        {/* A clinical document: black-on-white, rules instead of boxes, figures in a table. */}
        <motion.article
          className="report-page mx-auto flex flex-col bg-[#fff] text-navy shadow-overlay"
          initial={{ opacity: 0, y: 24, rotateX: 6 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={springSoft}
          style={{ width: '210mm', minHeight: '297mm', padding: '14mm 16mm 11mm', transformPerspective: 1200 }}
        >
          {/* Letterhead */}
          <header className="flex items-end justify-between gap-6 border-b-[2.5px] border-navy pb-3.5">
            <div>
              <Logo size={22} />
              <div className="mt-4 font-display text-[25px] leading-none font-bold tracking-[-0.03em]">Pre-visit voice report</div>
              <div className="mt-2 text-[12px] text-ink-muted tabular-nums">
                Period: weeks of {formatDay(`${weeks[0]}T12:00:00`)} – {formatDay(`${weeks.at(-1)}T12:00:00`)} · 14 weeks
              </div>
            </div>
            <div className="text-right text-[12px] leading-[1.55]">
              <div className="font-semibold">{CLINICIAN.name}</div>
              <div className="text-ink-muted">
                {CLINICIAN.specialty} · {CLINICIAN.clinic}
              </div>
              <div className="text-ink-muted tabular-nums">Generated {formatSessionTime(now.toISOString(), now)}</div>
            </div>
          </header>

          {/* Patient */}
          <section className="flex items-baseline justify-between gap-4 border-b border-ink-faint py-3.5">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[21px] leading-none font-bold tracking-[-0.02em]">{p.name}</h1>
              <StatusChip status={p.status} />
            </div>
            <div className="text-[12px] text-ink-muted tabular-nums">
              {patientNumber(p.id)}
              {p.age !== null && ` · ${p.age} years`}
              {p.yearsSinceDiagnosis !== null && ` · ${p.yearsSinceDiagnosis} yr since diagnosis`}
            </div>
          </section>

          {/* Summary: a coral rule down the side when the patient is on alert */}
          <section className={`mt-4 border-l-[3px] py-2 pr-4 pl-4 text-[13px] leading-snug ${p.status === 'alert' ? 'border-coral bg-coral/8' : 'border-navy/25 bg-paper/60'}`}>
            <div className="label !text-[10px]">Summary</div>
            <p className="mt-1 text-[13.5px] font-medium">{reportSummary(p)}</p>
          </section>

          {/* Trend */}
          <section className="mt-5">
            <SectionTitle note="Weekly voice stability index · band = personal baseline">Voice trend · 14 weeks</SectionTitle>
            <div className="mt-2">
              <TrendChart patient={p} height={206} interactive={false} still />
            </div>
          </section>

          {/* Biomarkers: one row each — measure, value, baseline, change */}
          <section className="mt-4">
            <SectionTitle>Biomarkers vs personal baseline · {latestLabel}</SectionTitle>
            <table className="mt-1 w-full border-collapse text-[12px]">
              <tbody>
                {BIOMARKERS.map((def) => {
                  const v = p.latest[def.key];
                  const b = p.baselineMetrics[def.key];
                  const level = deltaLevel(v, b);
                  return (
                    <tr key={def.key} className="border-b border-ink-hairline last:border-b-0">
                      <th scope="row" className="w-[34%] py-[7px] text-left font-semibold">
                        {def.label} <span className="font-normal text-ink-muted">· {def.measure}</span>
                      </th>
                      <td className="w-[20%] py-[7px] font-display text-[16px] font-bold tracking-tight tabular-nums">{formatMetric(def, v)}</td>
                      <td className="w-[24%] py-[7px] text-ink-muted tabular-nums">Baseline {formatMetric(def, b)}</td>
                      <td className={`py-[7px] text-right font-semibold tabular-nums ${LEVEL_TEXT[level]}`}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${LEVEL_DOT[level]}`} />
                        {formatDelta(v, b)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Quality + context */}
          <section className="mt-5 grid grid-cols-2 gap-8 text-[12px]">
            <div>
              <SectionTitle>Quality flags</SectionTitle>
              <ul className="mt-2 space-y-1">
                {qualityFlags(inPeriod).map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-watch" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionTitle>Session context</SectionTitle>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-ink-muted">Adherence</dt>
                <dd className="font-medium tabular-nums">{p.adherencePct} %</dd>
                <dt className="text-ink-muted">Channel</dt>
                <dd className="font-medium">{p.channel === 'device' ? `Home device${p.deviceId ? ` (${p.deviceId})` : ''}` : 'Patient app'}</dd>
                <dt className="text-ink-muted">Sessions on file</dt>
                <dd className="font-medium tabular-nums">{inPeriod.length}</dd>
                <dt className="text-ink-muted">{p.channel === 'device' ? 'Last sync' : 'Last session'}</dt>
                <dd className="font-medium tabular-nums">
                  {p.channel === 'device'
                    ? p.lastSyncAt
                      ? formatSessionTime(p.lastSyncAt, now)
                      : 'Never'
                    : last
                      ? formatSessionTime(last.startedAt, now)
                      : '—'}
                </dd>
              </dl>
            </div>
          </section>

          {p.notes.length > 0 && (
            <section className="mt-5 text-[12px]">
              <SectionTitle>Notes</SectionTitle>
              <ul className="mt-2 space-y-1">
                {p.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal" />
                    {n}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-auto flex items-end justify-between border-t border-navy/40 pt-2.5 text-[10px] text-ink-muted">
            <span>
              <span className="font-semibold text-navy">We measure; doctors decide.</span> Biomarkers are compared with the patient's own
              baseline and are not a diagnosis.
            </span>
            <span className="shrink-0 pl-4">Prototype · illustrative data · not a medical device</span>
          </footer>
        </motion.article>
      </div>
    </div>
  );
}

/** Section heading of the document: small caps over a hairline, with an optional note on the right. */
function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-faint pb-1.5">
      <h2 className="font-sans text-[10.5px] font-bold tracking-[0.14em] text-navy uppercase">{children}</h2>
      {note && <span className="text-[10.5px] text-ink-muted">{note}</span>}
    </div>
  );
}
