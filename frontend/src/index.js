import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import { installAuthFetch } from './lib/authFetch';

// Avant le premier rendu : toutes les requêtes API portent le jeton de session
installAuthFetch();

// Google Analytics : un seul tag (G-FQ349LRGNQ), chargé dans public/index.html

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
