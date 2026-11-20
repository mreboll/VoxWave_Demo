import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppStore } from '../data/store';
import { useVisitorProfile } from '../data/visitor';

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

/** Patient pages need welcome and consent completed in this browser. */
export function RequirePatient() {
  const profile = useVisitorProfile();
  const { search } = useLocation();
  return profile ? <Outlet /> : <Navigate to={{ pathname: '/patient/welcome', search }} replace />;
}

export function PatientIndex() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/patient/welcome', search }} replace />;
}
