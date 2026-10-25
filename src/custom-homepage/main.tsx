import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeService } from '@core/services';
import { App } from './App';
import './index.css';

ThemeService.getInstance();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
