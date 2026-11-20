import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { FileText, LayoutDashboard, LogOut, Usb, Users } from 'lucide-react';
import { Logo, LogoSymbol } from '../../components/Logo';
import { PrototypeFooter } from '../../components/PrototypeFooter';
import { Toaster, useToasts } from '../../components/Toast';
import { onDemoMessage, useAppStore } from '../../data/store';
import { ALERT_PATIENT_ID, buildSeed, CLINICIAN, DEMO_PATIENT_ID } from '../../data/seed';
import { useClinicUi } from './clinicUi';
import { DeviceSyncModal } from './sync/DeviceSyncModal';
import { now } from '../../data/clock';
import { formatDate } from '../../data/dates';

const today = () =>
  formatDate(now(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Hand-off (brief §7.2, §13 step 3): sessions finished in the patient tab and devices synced in another tab
 * arrive here live. The store is already re-read when the handler runs (onDemoMessage).
 */
function useLiveArrivals() {
  const push = useToasts((s) => s.push);
  const highlight = useClinicUi((s) => s.highlight);
  const showLive = useClinicUi((s) => s.showLive);
  useEffect(
    () =>
      onDemoMessage((m) => {
        const state = useAppStore.getState();
        if (m.type === 'session:new') {
          const session = state.sessions.find((s) => s.id === m.sessionId);
          if (!session) return;
          const name =
            session.patientId === DEMO_PATIENT_ID
              ? (state.demoName ?? 'Alex')
              : (buildSeed().patients.find((p) => p.id === session.patientId)?.name ?? session.patientId);
          highlight(session.patientId);
          showLive(session.id); // the card replays exactly what the toast announces
          push({
            title: `New session received · ${name} · just now`,
            body: session.simulated ? 'Done in demo mode (no microphone).' : 'Live check-in is replaying it.',
            action: { label: `Open ${name.split(' ')[0]}'s session`, to: `/clinic/patients/${session.patientId}` },
          });
        } else if (m.type === 'device:synced') {
          highlight(m.patientId);
          push({ title: `Device synced · ${m.count} sessions`, tone: 'teal', action: { label: 'Open patient', to: `/clinic/patients/${m.patientId}` } });
        }
      }),
    [push, highlight, showLive],
  );
}

/** Sidebar + header layout for the clinician portal (brief §7). */
export function ClinicShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const signOut = useAppStore((s) => s.setClinicSignedIn);
  const openSync = useClinicUi((s) => s.openSync);
  useLiveArrivals();

  const nav = [
    { to: '/clinic/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clinic/dashboard#patients', label: 'Patients', icon: Users, match: '/clinic/patients' },
    { label: 'Device sync', icon: Usb, onClick: () => openSync() },
    { to: `/clinic/patients/${ALERT_PATIENT_ID}/report`, label: 'Reports', icon: FileText },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 z-30 flex items-center gap-1 border-b border-ink-faint bg-paper/90 px-3 py-3 backdrop-blur sm:gap-2 sm:px-4 lg:h-dvh lg:flex-col lg:items-stretch lg:gap-1 lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <NavLink to="/clinic/dashboard" className="mr-auto lg:mr-0 lg:mb-8 lg:px-2" aria-label="VoxWave · Dashboard">
          {/* Phones: symbol only, so the top bar (logo + 5 icons) fits down to 320 px (D99). */}
          <LogoSymbol size={24} className="sm:hidden" />
          {/* Wrapper does the hiding: Logo's own `inline-flex` would override a `hidden` passed to it. */}
          <span className="hidden sm:inline">
            <Logo size={26} />
          </span>
        </NavLink>
        {nav.map((item) => {
          const Icon = item.icon;
          const cls = (active: boolean) =>
            `btn btn-press group flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium sm:px-2.5 ${
              active ? 'bg-navy text-white' : 'text-ink-muted'
            }`;
          if (!item.to) {
            return (
              <button key={item.label} type="button" onClick={item.onClick} className={cls(false)} aria-label={item.label}>
                <Icon size={17} />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.label}
              to={item.to}
              // Below 1024 px only the icon shows: keep an accessible name (D85).
              aria-label={item.label}
              end={item.end}
              className={({ isActive }) =>
                cls(item.match ? pathname.startsWith(item.match) && !pathname.endsWith('/report') : item.label === 'Reports' ? pathname.endsWith('/report') : isActive)
              }
            >
              <Icon size={17} />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          );
        })}
        {/* Below 1024 px the sidebar is a top bar: keep a way to sign out there too (icon only, named) (D98). */}
        <button
          type="button"
          onClick={() => {
            signOut(false);
            navigate('/clinic/login');
          }}
          aria-label="Sign out"
          className="btn btn-press flex items-center rounded-xl px-2 py-2 text-ink-muted sm:px-2.5 lg:hidden"
        >
          <LogOut size={17} />
        </button>
        <div className="hidden lg:mt-auto lg:block">
          <button
            type="button"
            onClick={() => {
              signOut(false);
              navigate('/clinic/login');
            }}
            className="btn btn-press flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-muted"
          >
            <LogOut size={17} />
            Sign out
          </button>
          <PrototypeFooter className="mt-4 px-2.5 leading-relaxed" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-6 pb-2 sm:px-8 lg:px-10">
          <div className="text-sm text-ink-muted">{today()}</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-navy">{CLINICIAN.name}</div>
              <div className="text-xs text-ink-muted">
                {CLINICIAN.specialty} · {CLINICIAN.clinic}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-display text-xs font-bold text-white">
              EL
            </div>
          </div>
        </header>
        <main className="flex-1 px-5 pb-10 sm:px-8 lg:px-10">
          <Outlet />
        </main>
        <PrototypeFooter className="px-5 pb-5 lg:hidden" />
      </div>

      <DeviceSyncModal />
      <Toaster />
    </div>
  );
}
