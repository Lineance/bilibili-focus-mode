import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeService } from '@core/services';
import { App } from './App';
import './index.css';

// Apply the persisted theme before the first paint to avoid a flash.
ThemeService.getInstance();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
