import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyRehearsal, isRehearsal } from './data/clock';
import { useAppStore } from './data/store';
import { subscribeDemoMessages } from './data/broadcast';
import { reloadAfterReset } from './demo/actions';
// Fonts are bundled (no request to Google Fonts): works offline on stage and sends nothing out (D71).
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import './design/tokens.css';

// The clock must be set before anything computes "today" (the store hydrates synchronously from localStorage).
applyRehearsal(useAppStore.getState().rehearsal);

// Toggling the rehearsal clock (here or in the other window) reloads, so every date is recomputed at once.
useAppStore.subscribe((s) => {
  if (s.rehearsal !== isRehearsal()) window.location.reload();
});
// "Reset demo" in another window: start that window from scratch too (drops toasts, highlights, a session in progress).
subscribeDemoMessages((m) => {
  if (m.type === 'demo:reset') reloadAfterReset();
});

document.body.classList.add('grain');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
