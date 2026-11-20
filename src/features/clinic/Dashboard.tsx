import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Activity as ActivityIcon, ArrowRight, Radio, Search, Usb } from 'lucide-react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { STATUS_LABEL, STATUS_ORDER } from '../../components/StatusChip';
import { WaveformReplay } from '../../components/WaveformReplay';
import { AudioPlayButton, usePlayback } from '../../components/AudioPlayButton';
import { useAudioEnvelope } from '../../audio/envelope';
import { useDerivedData } from '../../data/store';
import { formatSessionTime, sessionTime } from '../../data/dates';
import { weeksOutsideBand } from '../../data/scripted';
import { ACTIVITY_LABEL, ACTIVITY_SHORT } from '../../data/biomarkers';
import { patientNumber, WEEK_ADHERENCE_PCT } from '../../data/clinicText';
import type { Patient, Session, Status } from '../../data/types';
import { riseIn, spring, staggerContainer } from '../../design/motion';
import { PatientCard } from './PatientCard';
import { ScheduleVisitButton } from './ScheduleVisitButton';
import { useClinicUi } from './clinicUi';
import { now } from '../../data/clock';

const sortPatients = (a: Patient, b: Patient) =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
  Number(Boolean(a.minor)) - Number(Boolean(b.minor)) ||
  (b.lastSessionAt ?? '').localeCompare(a.lastSessionAt ?? '');

export function Dashboard() {
  const { patients, sessions, syncedDevices } = useDerivedData();
  const openSync = useClinicUi((s) => s.openSync);
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();

  // Sidebar "Device sync" from another page lands here with ?sync=1.
  useEffect(() => {
    if (params.get('sync') === '1') {
      openSync();
      setParams({}, { replace: true });
    }
  }, [params, setParams, openSync]);

  useEffect(() => {
    if (hash === '#patients') document.getElementById('patients')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  const alerts = patients.filter((p) => p.status === 'alert');
  const devicesToSync = patients.filter((p) => p.deviceId && !syncedDevices[p.deviceId]).length;
  // Live check-in (D77): the session just announced by the patient window; otherwise the most recent one that
  // has already happened. A device can carry sessions dated after this computer's clock (the sample USB is
  // dated for the final): those keep their real dates but never take over the card.
  const liveSessionId = useClinicUi((s) => s.liveSessionId);
  const nowMs = now().getTime();
  const latest =
    sessions.find((s) => s.id === liveSessionId) ??
    [...sessions].reverse().find((s) => Date.parse(sessionTime(s)) <= nowMs);
  const latestPatient = latest && patients.find((p) => p.id === latest.patientId);

  return (
    <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="mx-auto max-w-[1280px]">
      {/* The headline carries the first figure of the video ("24 patients monitored"); the other three sit in
          one strip under it, so all four are on the first screen at 1024×768 too. */}
      <motion.div variants={riseIn} className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2">
        <div>
          <p className="label">Clinician dashboard · Today</p>
          <h1 className="mt-1.5 text-[32px] leading-[1.05] font-bold tracking-[-0.035em] text-navy sm:text-[38px] xl:text-[44px]">
            <AnimatedNumber value={patients.length} /> patients monitored
          </h1>
        </div>
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openSync()}
          className="btn inline-flex items-center gap-2.5 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-on-coral shadow-action"
        >
          <Usb size={17} />
          Sync VoxWave device
        </motion.button>
      </motion.div>

      <motion.div variants={riseIn} className="surface mt-6 grid grid-cols-3 divide-x divide-ink-hairline rounded-2xl">
        <Stat icon={<ActivityIcon size={17} />} value={alerts.length} label={`voice drift alert${alerts.length === 1 ? '' : 's'}`} tone={alerts.length ? 'coral' : undefined} delay={0.1} />
        <Stat icon={<ActivityIcon size={17} />} value={WEEK_ADHERENCE_PCT} suffix=" %" label="adherence this week" delay={0.18} />
        <Stat
          icon={<Radio size={17} />}
          value={devicesToSync}
          label={devicesToSync === 1 ? 'device to sync' : devicesToSync === 0 ? 'devices to sync · all synced' : 'devices to sync'}
          delay={0.26}
        />
      </motion.div>

      {alerts.map((p) => (
        <AlertBanner key={p.id} patient={p} />
      ))}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PatientsGrid patients={patients} />
        <motion.div variants={riseIn} className="order-first xl:order-none">
          {latest && latestPatient && <LiveCheckIn session={latest} patient={latestPatient} />}
        </motion.div>
      </div>
    </motion.div>
  );
}

function Stat({
  icon,
  value,
  label,
  suffix = '',
  tone,
  delay,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  tone?: 'coral';
  delay: number;
}) {
  // One cell of the strip: icon, the figure in Sora, and its label beside it (under it on narrow screens).
  return (
    <div className="flex items-center gap-3 px-3.5 py-4 sm:gap-4 sm:px-6 sm:py-5">
      <div
        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex ${tone === 'coral' ? 'bg-coral/12 text-coral-ink' : 'bg-paper-shade text-navy'}`}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-col gap-x-3 gap-y-1 xl:flex-row xl:items-center">
        <div className={`numeral shrink-0 text-[28px] whitespace-nowrap sm:text-[32px] ${tone === 'coral' ? 'text-coral-strong' : 'text-navy'}`}>
          <AnimatedNumber value={value} suffix={suffix} delay={delay} />
        </div>
        <div className="text-[13px] leading-tight text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function AlertBanner({ patient }: { patient: Patient }) {
  const replay = useClinicUi((s) => s.alertReplay);
  const navigate = useNavigate();
  const weeks = weeksOutsideBand(patient);
  return (
    <motion.div
      key={replay}
      initial={{ opacity: 0, y: -14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: replay ? 0 : 0.45 }}
      className="relative mt-4 overflow-hidden rounded-2xl bg-coral text-on-coral shadow-raised"
      role="alert"
    >
      {/* Soft sweep of light across the banner on entrance */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        initial={{ x: '-120%' }}
        animate={{ x: '420%' }}
        transition={{ delay: (replay ? 0 : 0.45) + 0.3, duration: 1.1, ease: 'easeInOut' }}
      />
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3.5 sm:px-6">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-on-coral opacity-50 [animation-duration:1.8s]" />
          <span className="relative h-3 w-3 rounded-full bg-on-coral" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] leading-tight font-bold tracking-tight">Voice drift detected</div>
          <div className="mt-0.5 text-sm text-on-coral/85">
            {patientNumber(patient.id)} · {patient.name} · {weeks} week{weeks === 1 ? '' : 's'} outside personal baseline
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/clinic/patients/${patient.id}`)}
            className="btn btn-press inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            Open patient
            <ArrowRight size={15} />
          </button>
          <ScheduleVisitButton patientId={patient.id} tone="coral" />
        </div>
      </div>
    </motion.div>
  );
}

function LiveCheckIn({ session, patient }: { session: Session; patient: Patient }) {
  // The activity on show: the one being played, else the conversation (the longest, most "live" one).
  const playingId = usePlayback((s) => s.current);
  const progress = usePlayback((s) => s.progress);
  const playing = session.activities.find((a) => playingId === `${session.id}/${a.type}`);
  const shown = playing ?? session.activities.find((a) => a.type === 'conversation') ?? session.activities.at(-1);
  const shownId = shown ? `${session.id}/${shown.type}` : session.id;
  const envelope = useAudioEnvelope(shown, shownId);

  // A session that arrives while the dashboard is open gets a glow (not the one shown on first load).
  const firstId = useRef(session.id);
  const arrived = session.id !== firstId.current;

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-raised xl:sticky xl:top-24"
    >
      {arrived && (
        <motion.div
          key={`glow-${session.id}`}
          className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-coral ring-inset"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0.3, 1, 0] }}
          transition={{ duration: 2.4, ease: 'easeInOut' }}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.15em] text-white/70 uppercase">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-coral opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-coral" />
          </span>
          Live check-in
        </span>
        {/* "Just now" only for a session that really is recent: a synced device brings older ones. */}
        <span className="text-xs text-white/60">
          {session.captureClockSynced === false && session.receivedAt && 'Received '}
          {arrived && now().getTime() - Date.parse(sessionTime(session)) < 10 * 60_000 ? 'Just now' : formatSessionTime(sessionTime(session))}
        </span>
      </div>
      <AnimatePresence mode="wait">
        {/* Stacked in the side column (≥ 1280 px) and on phones; between the two it is one row — who, the
            wave, the clips — so the patients below stay on the first screen at 1024×768. */}
        <motion.div
          key={session.id}
          className="mt-4 flex flex-col md:max-xl:mt-3 md:max-xl:grid md:max-xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] md:max-xl:items-center md:max-xl:gap-x-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <div className="min-w-0">
            <div className="truncate font-display text-xl leading-tight font-bold tracking-tight">{patient.name}</div>
            <div className="mt-0.5 text-sm text-white/65">
              {patientNumber(patient.id)} · {shown ? ACTIVITY_LABEL[shown.type] : 'Session'}
              {session.simulated && ' · demo mode'}
            </div>
          </div>
          <WaveformReplay
            seed={shownId}
            envelope={envelope}
            progress={playing ? progress : null}
            height={72}
            className="mt-5 md:max-xl:row-span-2 md:max-xl:mt-0"
          />
          <div className="mt-4 flex flex-wrap gap-2 md:max-xl:row-span-2 md:max-xl:mt-0">
            {session.activities.map((a) => (
              <AudioPlayButton key={a.type} id={`${session.id}/${a.type}`} activity={a} label={ACTIVITY_SHORT[a.type]} />
            ))}
          </div>
          <Link
            to={`/clinic/patients/${patient.id}`}
            className="btn mt-5 inline-flex items-center gap-1.5 self-start rounded-md text-sm font-semibold text-coral-soft md:max-xl:col-start-1 md:max-xl:row-start-2 md:max-xl:mt-2"
          >
            Open {patient.name.split(' ')[0]}'s sessions
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

const FILTERS: Array<Status | 'all'> = ['all', 'alert', 'watch', 'new', 'device', 'stable'];

function PatientsGrid({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const highlightId = useClinicUi((s) => s.highlightId);
  const highlightAt = useClinicUi((s) => s.highlightAt);
  // "Just now" for 10 minutes only, the same rule as the Live check-in (D93); re-check every 30 s meanwhile.
  const [, tick] = useState(0);
  const justNow = highlightId !== null && now().getTime() - highlightAt < 10 * 60_000;
  useEffect(() => {
    if (!justNow) return;
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [justNow]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: patients.length };
    for (const p of patients) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [patients]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...patients]
      .filter((p) => filter === 'all' || p.status === filter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
      // A patient whose session just arrived slides to the top (brief §7.2), but never above an alert: the
      // presenter's next click is Margaret, so her card must not move (D75). `layout` animates the move.
      .sort((a, b) => {
        const rank = (p: Patient) => (p.status === 'alert' ? 0 : p.id === highlightId ? 1 : 2);
        return rank(a) - rank(b) || sortPatients(a, b);
      });
  }, [patients, filter, query, highlightId]);

  return (
    <motion.section variants={riseIn} id="patients" className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-navy">Patients</h2>
        <label className="relative">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or ID"
            className="w-56 rounded-full bg-card py-2 pr-3 pl-9 text-sm ring-1 ring-ink-faint ring-inset outline-none placeholder:text-ink-muted focus:ring-navy/40"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.filter((f) => f === 'all' || counts[f]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`btn relative rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? 'text-white' : 'text-ink-muted'}`}
          >
            {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-navy" transition={spring} />}
            <span className="relative">
              {f === 'all' ? 'All' : STATUS_LABEL[f]} <span className="tabular-nums opacity-70">{counts[f] ?? 0}</span>
            </span>
          </button>
        ))}
      </div>

      <motion.div
        variants={staggerContainer(0.35)}
        initial="hidden"
        animate="show"
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
      >
        {visible.map((p, i) => (
          <PatientCard key={p.id} patient={p} index={i} highlighted={p.id === highlightId} justNow={justNow && p.id === highlightId} />
        ))}
      </motion.div>
      {visible.length === 0 && <p className="mt-8 text-center text-sm text-ink-muted">No patients match.</p>}
    </motion.section>
  );
}
