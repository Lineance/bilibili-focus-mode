import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeService } from '@core/services';
import { Popup } from './Popup';
import './index.css';

ThemeService.getInstance();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
