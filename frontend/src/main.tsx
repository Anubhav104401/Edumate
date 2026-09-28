/*
 * The very first frontend code that runs. It finds <div id="root"> in index.html
 * and tells React to draw the <App /> inside it.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
