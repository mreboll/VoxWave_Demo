// Stage fallbacks behind the demo panel (brief §11). Each one goes through the same code path as the real
// thing, so the clinic reacts exactly as it would to a real session / sync.
import { dispatchLocal } from '../data/broadcast';
import { now } from '../data/clock';
import { buildPatientSession, newSessionId, type ActivityCapture } from '../data/patientSession';
import { DEMO_PATIENT_ID } from '../data/seed';
import { useAppStore } from '../data/store';

const SIMULATED: Array<Pick<ActivityCapture, 'type' | 'durationSec'>> = [
  { type: 'sustained_vowel', durationSec: 5.1 },
  { type: 'reading', durationSec: 6.4 },
  { type: 'conversation', durationSec: 21.3 },
];

/**
 * "Simulate session from patient": a finished P-DEMO session with the bundled sample clips, as if the mic
 * had failed on stage. Uses the next-result setting; creates "Alex" if nobody has started the patient app.
 * Marked `simulated` (the clinic shows "Demo mode"): we never pass sample audio off as a real recording.
 */
export function simulatePatientSession() {
  const store = useAppStore.getState();
  if (store.demoName === null) store.startAsPatient('Alex');
  const startedAt = new Date(now().getTime() - 3 * 60_000); // a 3-minute session that just ended
  const session = buildPatientSession(
    newSessionId(now()),
    startedAt,
    SIMULATED.map((a) => ({ ...a, rmsAvg: null, rmsPeak: null, simulated: true })),
    store.nextResult,
  );
  useAppStore.getState().addPatientSession(session); // stored + announced to the other window
  dispatchLocal({ type: 'session:new', sessionId: session.id }); // …and to this one, if it's the clinic
  return session;
}

/**
 * After "Reset demo" (this window or the other one): start again from a page that still exists. The demo
 * patient is gone, so a window on Alex's sheet or report goes to the dashboard instead of "Patient not found"
 * (D100); patient pages fall back to the welcome screen through their guard.
 */
export function reloadAfterReset() {
  const { pathname, search } = window.location;
  if (pathname.startsWith(`/clinic/patients/${DEMO_PATIENT_ID}`)) window.location.replace(`/clinic/dashboard${search}`);
  else window.location.reload();
}
