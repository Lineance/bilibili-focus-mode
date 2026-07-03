import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeService } from '@core/services';
import { App } from './App';
import './index.css';

const themeService = new ThemeService();
themeService.initialize();

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);