import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppStore } from '../data/store';

// Route guards live outside the portals so they don't pull a whole portal chunk into the main bundle (D70).
// Redirects keep the query string (e.g. ?demo=1) and, for the clinic, where you were going (D96).

/** Clinic pages need the fake sign-in of this browser. */
export function RequireClinician() {
  const signedIn = useAppStore((s) => s.clinicSignedIn);
  const { pathname, search } = useLocation();
  return signedIn ? <Outlet /> : <Navigate to={{ pathname: '/clinic/login', search }} state={{ from: pathname + search }} replace />;
}

export function ClinicIndex() {
  const signedIn = useAppStore((s) => s.clinicSignedIn);
  const { search } = useLocation();
  return <Navigate to={{ pathname: signedIn ? '/clinic/dashboard' : '/clinic/login', search }} replace />;
}

/** Patient pages need the demo patient (welcome + consent) to exist. */
export function RequirePatient() {
  const name = useAppStore((s) => s.demoName);
  const { search } = useLocation();
  return name === null ? <Navigate to={{ pathname: '/patient/welcome', search }} replace /> : <Outlet />;
}

export function PatientIndex() {
  const name = useAppStore((s) => s.demoName);
  const { search } = useLocation();
  return <Navigate to={{ pathname: name === null ? '/patient/welcome' : '/patient/home', search }} replace />;
}
