/*
 * The very first frontend code that runs. It loads the fonts and the stylesheets, finds
 * <div id="root"> in index.html and tells React to draw the <App /> inside it.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The fonts travel with the app itself (no call to Google Fonts), so they work offline and
// the Content-Security-Policy in nginx.conf can keep allowing files from this site only.
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400-italic.css';
import 'lenis/dist/lenis.css';
import './styles/theme.css';
import './styles/app.css';
import './styles/landing.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
