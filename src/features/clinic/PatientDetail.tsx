import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Check, FileText, Info, Radio, Smartphone, Volume2 } from 'lucide-react';
import { TrendChart } from '../../components/charts/TrendChart';
import { BiomarkerRing } from '../../components/charts/BiomarkerRing';
import { StatusChip } from '../../components/StatusChip';
import { AudioPlayButton } from '../../components/AudioPlayButton';
import { useAppStore, usePatient } from '../../data/store';
import { formatDay, formatSessionTime, isSameLocalDay } from '../../data/dates';
import { weeksOutsideBand } from '../../data/scripted';
import { ACTIVITY_SHORT, BIOMARKERS } from '../../data/biomarkers';
import { patientNumber } from '../../data/clinicText';
import type { Patient, Session } from '../../data/types';
import { riseIn, staggerContainer } from '../../design/motion';
import { ScheduleVisitButton } from './ScheduleVisitButton';
import { now } from '../../data/clock';

export function PatientDetail() {
  const { id } = useParams();
  const { patient, sessions } = usePatient(id);

  // Block body on purpose: newer browsers return a Promise from scrollTo, which React would take as a cleanup.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (!patient) {
    return (
      <div className="py-24 text-center">
        <p className="text-ink-muted">Patient not found.</p>
        <Link to="/clinic/dashboard" className="mt-3 inline-block text-sm font-semibold text-coral">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const recent = [...sessions].reverse();
  const lastSession = recent[0];
  const biomarkersToday = lastSession && isSameLocalDay(new Date(lastSession.startedAt), now());

  return (
    <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="mx-auto max-w-[1180px]">
      <motion.div variants={riseIn}>
        <Link to="/clinic/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-navy">
          <ArrowLeft size={15} />
          All patients
        </Link>
      </motion.div>

      <Header
        patient={patient}
        // A synced device can carry sessions dated after this computer's clock (the sample USB is dated for the
        // final). Dates are never rewritten (D66), so say why they look like the future (D88).
        deviceAhead={sessions.some((s) => s.channel === 'device' && new Date(s.startedAt).getTime() > now().getTime())}
      />

      {/* Close under the header, so at 1024×768 the whole chart (and the points outside the band) is on the
          first screen when the presenter opens Margaret. */}
      <motion.section variants={riseIn} className="surface mt-4 rounded-2xl p-5 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold tracking-tight text-navy">Voice trend · 14 weeks</h2>
          <span className="text-xs text-ink-muted">Weekly voice stability index vs personal baseline</span>
        </div>
        <div className="mt-3">
          <TrendChart patient={patient} height={292} delay={0.35} />
        </div>
      </motion.section>

      <motion.section variants={riseIn} className="mt-6">
        <h2 className="font-display text-lg font-bold tracking-tight text-navy">
          Biomarkers · {biomarkersToday ? 'today' : lastSession ? `latest session (${formatDay(lastSession.startedAt)})` : 'latest'}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {BIOMARKERS.map((def, i) => (
            <BiomarkerRing
              key={def.key}
              def={def}
              value={patient.latest[def.key]}
              baseline={patient.baselineMetrics[def.key]}
              history={sessions.slice(-10).map((s) => s.result.metrics[def.key])}
              delay={0.45 + i * 0.08}
            />
          ))}
        </div>
      </motion.section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <motion.section variants={riseIn} className="surface rounded-2xl p-5 sm:px-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight text-navy">Sessions</h2>
            <span className="text-xs text-ink-muted tabular-nums">{sessions.length} recent</span>
          </div>
          <SessionsList sessions={recent} />
        </motion.section>
        {/* The notes stay in view while the (long) session list scrolls. */}
        <motion.section variants={riseIn} className="lg:sticky lg:top-6">
          {/* Keyed by patient: going from one patient to another (toast link, back/forward) reuses this page,
              and without the key the draft of the first patient was saved onto the second (D90). */}
          <Notes key={patient.id} patient={patient} />
        </motion.section>
      </div>
    </motion.div>
  );
}

function Header({ patient: p, deviceAhead }: { patient: Patient; deviceAhead: boolean }) {
  const weeks = weeksOutsideBand(p);
  const facts: Array<[string, React.ReactNode]> = [
    ['Age', p.age ?? '—'],
    ['Since diagnosis', p.yearsSinceDiagnosis !== null ? `${p.yearsSinceDiagnosis} yr` : '—'],
    ['Adherence', `${p.adherencePct} %`],
    [
      'Channel',
      // Device id on its own smaller line, so the cell never wraps into three lines (D82).
      <span className="flex items-start gap-1.5">
        {p.channel === 'device' ? <Radio size={14} className="mt-0.5 shrink-0" /> : <Smartphone size={14} className="mt-0.5 shrink-0" />}
        <span>
          {p.channel === 'device' ? 'Home device' : 'App'}
          {p.channel === 'device' && p.deviceId && <span className="block text-xs font-normal text-ink-muted">{p.deviceId}</span>}
        </span>
      </span>,
    ],
    p.channel === 'device'
      ? ['Last sync', p.lastSyncAt ? formatSessionTime(p.lastSyncAt) : 'Never']
      : ['Last session', p.lastSessionAt ? formatSessionTime(p.lastSessionAt) : '—'],
  ];

  return (
    <motion.div
      layoutId={`patient-card-${p.id}`}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className={`surface mt-3 overflow-hidden rounded-2xl ${p.status === 'alert' ? 'ring-coral/60' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6 xl:py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <motion.h1
              layoutId={`patient-name-${p.id}`}
              className="font-display text-[28px] leading-tight font-bold tracking-[-0.03em] text-navy xl:text-[32px]"
            >
              {p.name}
            </motion.h1>
            <StatusChip status={p.status} />
          </div>
          <div className="mt-0.5 text-sm text-ink-muted tabular-nums">
            {patientNumber(p.id)}
          </div>
        </div>
        {/* Between 1024 and 1280 px the button icons are dropped, so name and actions share one row and the
            chart below stays on the first screen. */}
        <div className="flex flex-wrap gap-2 lg:max-xl:[&_svg]:hidden">
          <ScheduleVisitButton patientId={p.id} />
          <Link
            to={`/clinic/patients/${p.id}/report`}
            className="btn btn-press inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            <FileText size={16} />
            Open one-page report
          </Link>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px border-t border-ink-faint bg-ink-faint sm:grid-cols-3 xl:grid-cols-5">
        {facts.map(([k, v]) => (
          // 5 facts: the last one spans 2 columns on 2- and 3-column layouts so no empty cell shows. Five columns only
          // from 1280 px: at 1024 px they were too narrow and "Home device · VW-DEV-0003" wrapped (D82).
          <div key={k} className="bg-card px-5 py-2.5 last:col-span-2 sm:px-6 xl:py-3 xl:last:col-span-1">
            <dt className="label">{k}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold text-navy tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {deviceAhead && (
        <div className="flex items-center gap-2 border-t border-ink-faint bg-paper/60 px-5 py-2 text-xs text-ink-muted sm:px-6">
          <Info size={13} className="shrink-0" />
          Session dates come from the home device, whose clock is ahead of this computer’s.
        </div>
      )}
      {weeks > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2.5 bg-coral px-5 py-2 text-sm font-semibold text-on-coral sm:px-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-on-coral opacity-50" />
            <span className="relative h-2 w-2 rounded-full bg-on-coral" />
          </span>
          Outside personal baseline · {weeks} week{weeks === 1 ? '' : 's'}
        </motion.div>
      )}
    </motion.div>
  );
}

const durationOf = (s: Session) => s.activities.reduce((t, a) => t + a.durationSec, 0);

function SessionsList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) return <p className="mt-6 text-sm text-ink-muted">No sessions yet.</p>;
  return (
    // Rows lay out by the width of the list itself (container query): three aligned columns when it is wide,
    // date + clips over the flags when it shares the row with the notes at 1024 px.
    <motion.ul variants={staggerContainer(0.6)} initial="hidden" animate="show" className="@container mt-2 divide-y divide-ink-hairline">
      {sessions.map((s) => (
        <motion.li
          key={s.id}
          variants={riseIn}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-2.5 @[34rem]:grid-cols-[9rem_minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-navy tabular-nums">{formatSessionTime(s.startedAt)}</div>
            <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-muted tabular-nums">
              {s.channel === 'device' ? <Radio size={12} /> : <Smartphone size={12} />}
              {s.channel === 'device' ? 'Device' : 'App'} · {Math.round(durationOf(s))} s
            </div>
          </div>
          <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap gap-1.5 @[34rem]:col-span-1 @[34rem]:col-start-2 @[34rem]:row-start-1">
            {s.simulated && (
              <span
                className="rounded-full bg-navy/6 px-2 py-0.5 text-[11px] font-semibold text-navy/70"
                title="Done without a microphone: sample audio, scripted values"
              >
                Demo mode
              </span>
            )}
            {s.quality && s.quality.noise !== 'low' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-watch/14 px-2 py-0.5 text-[11px] font-semibold text-watch-ink">
                <Volume2 size={11} />
                Background noise
              </span>
            )}
            {s.result.status === 'attention' ? (
              <span className="rounded-full bg-coral/12 px-2 py-0.5 text-[11px] font-semibold text-coral-ink">Outside baseline</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-stable/10 px-2 py-0.5 text-[11px] font-semibold text-stable-ink">
                <Check size={11} />
                Within baseline
              </span>
            )}
          </div>
          <div className="col-start-2 row-start-1 flex justify-end gap-1 @[34rem]:col-start-3">
            {s.activities.map((a) => (
              <AudioPlayButton key={a.type} id={`${s.id}/${a.type}`} activity={a} label={ACTIVITY_SHORT[a.type]} />
            ))}
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function Notes({ patient }: { patient: Patient }) {
  const saved = useAppStore((s) => s.notes[patient.id] ?? '');
  const setNote = useAppStore((s) => s.setNote);
  const [draft, setDraft] = useState(saved);
  const dirty = draft !== saved;

  // Save shortly after typing stops (shared with the other devices when Supabase is on, D114).
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => setNote(patient.id, draft), 500);
    return () => clearTimeout(t);
  }, [draft, dirty, patient.id, setNote]);

  // Leaving the patient (another page, or another patient) within the 500 ms: save what was typed (D90).
  const pending = useRef({ id: patient.id, draft, dirty });
  pending.current = { id: patient.id, draft, dirty };
  useEffect(
    () => () => {
      const p = pending.current;
      if (p.dirty) setNote(p.id, p.draft);
    },
    [setNote],
  );

  return (
    <div className="surface rounded-2xl p-5 sm:px-6">
      <h2 className="font-display text-lg font-bold tracking-tight text-navy">Clinician notes</h2>
      {patient.notes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {patient.notes.map((n) => (
            <li key={n} className="flex gap-2 text-sm text-navy/85">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal" />
              {n}
            </li>
          ))}
        </ul>
      )}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        placeholder="Add a note for the next visit…"
        className="mt-4 w-full resize-none rounded-xl bg-paper/60 p-3 text-sm ring-1 ring-ink-faint ring-inset outline-none placeholder:text-ink-muted focus:ring-navy/40"
      />
      <div className="mt-1 h-4 text-right text-[11px] text-ink-muted">{dirty ? 'Saving…' : saved ? 'Saved on this computer' : ''}</div>
    </div>
  );
}
