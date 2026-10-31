import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import ReactGA from 'react-ga4';
import { installAuthFetch } from './lib/authFetch';

// Avant le premier rendu : toutes les requêtes API portent le jeton de session
installAuthFetch();

ReactGA.initialize("G-RG2S4NX7NH");

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
