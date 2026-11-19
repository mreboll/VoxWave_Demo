import { createBrowserRouter, Navigate } from 'react-router';
import { Landing } from '../features/Landing';
import { ClinicIndex, PatientIndex, RequireClinician, RequirePatient } from './guards';
import { RootLayout } from './RootLayout';

// Each portal page is its own chunk (D70). The landing loads up front; RootLayout preloads the rest while
// idle, so on stage no navigation waits for the network.
export const pages = {
  Welcome: () => import('../features/patient/Welcome').then((m) => ({ Component: m.Welcome })),
  Home: () => import('../features/patient/Home').then((m) => ({ Component: m.Home })),
  Session: () => import('../features/patient/Session').then((m) => ({ Component: m.Session })),
  Result: () => import('../features/patient/Result').then((m) => ({ Component: m.Result })),
  Progress: () => import('../features/patient/Progress').then((m) => ({ Component: m.Progress })),
  Login: () => import('../features/clinic/Login').then((m) => ({ Component: m.Login })),
  ClinicShell: () => import('../features/clinic/ClinicShell').then((m) => ({ Component: m.ClinicShell })),
  Dashboard: () => import('../features/clinic/Dashboard').then((m) => ({ Component: m.Dashboard })),
  PatientDetail: () => import('../features/clinic/PatientDetail').then((m) => ({ Component: m.PatientDetail })),
  Report: () => import('../features/clinic/Report').then((m) => ({ Component: m.Report })),
};

// Information architecture: brief §5. Everything sits under RootLayout (demo panel on every page).
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    // Shown for the instant a page chunk loads on a direct visit (blank paper, no flash of white).
    HydrateFallback: () => <div className="min-h-dvh bg-paper" />,
    children: [
      { path: '/', element: <Landing /> },

      { path: '/patient', element: <PatientIndex /> },
      { path: '/patient/welcome', lazy: pages.Welcome },
      {
        element: <RequirePatient />,
        children: [
          { path: '/patient/home', lazy: pages.Home },
          { path: '/patient/session', lazy: pages.Session },
          { path: '/patient/result', lazy: pages.Result },
          { path: '/patient/progress', lazy: pages.Progress },
        ],
      },

      { path: '/clinic', element: <ClinicIndex /> },
      { path: '/clinic/login', lazy: pages.Login },
      {
        element: <RequireClinician />,
        children: [
          {
            lazy: pages.ClinicShell,
            children: [
              { path: '/clinic/dashboard', lazy: pages.Dashboard },
              { path: '/clinic/patients/:id', lazy: pages.PatientDetail },
            ],
          },
          { path: '/clinic/patients/:id/report', lazy: pages.Report },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
