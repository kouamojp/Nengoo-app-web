import React, { lazy, Suspense, useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { onAssistantOpen } from '../../lib/assistant';
import { SparkIcon } from '../ui/Icons';

// Chargé au premier clic : la plupart des pages vues n'ouvrent pas l'assistant
const AssistantPanel = lazy(() => import('./AssistantPanel'));

// Espaces de travail et tunnels où le bouton gênerait plus qu'il n'aide
const HIDDEN_PATHS = [
  '/admin/*', '/login/*', '/signup/*', '/checkout', '/forgot-password', '/reset-password',
  '/pending-approval', '/livreur/*', '/verify-buyer/*', '/seller',
  '/seller/products', '/seller/orders', '/seller/analytics', '/seller/profile', '/seller/messages',
];

const AssistantWidget = ({ language }) => {
  const { pathname } = useLocation();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const t = translations[language].assistant;

  useEffect(() => onAssistantOpen((text) => {
    setMounted(true);
    setOpen(true);
    if (text) setPrompt({ text });
  }), []);

  const hidden = HIDDEN_PATHS.some(path => matchPath(path, pathname));
  const productId = matchPath('/product/:idOrSlug', pathname)?.params.idOrSlug;

  return (
    <>
      {!open && !hidden && (
        <button
          type="button"
          onClick={() => { setMounted(true); setOpen(true); }}
          aria-label={t.cta}
          className={`fixed z-40 right-3 md:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 !min-h-0 !min-w-0 h-11 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-sm font-semibold shadow-lg flex items-center justify-center gap-2 transition-colors ${
            productId ? 'w-11 md:w-auto md:pl-3 md:pr-4' : 'pl-3 pr-4'
          }`}
        >
          <SparkIcon className="w-5 h-5 text-yellow-300" />
          {/* Icône seule sur la fiche d'un téléphone : le libellé couvrirait le prix */}
          {!productId && <span className="md:hidden">{t.title}</span>}
          <span className="hidden md:inline">{t.cta}</span>
        </button>
      )}
      {mounted && (
        <Suspense fallback={null}>
          <AssistantPanel
            open={open && !hidden}
            language={language}
            productId={productId}
            prompt={prompt}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
};

export default AssistantWidget;
