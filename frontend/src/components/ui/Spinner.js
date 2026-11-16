import React, { useEffect, useState } from 'react';

const TONES = {
  light: 'border-white/40 border-t-white',       // sur un bouton foncé
  dark: 'border-purple-200 border-t-purple-700',  // sur fond clair
};

/** Petit cercle qui tourne, à placer dans un bouton pendant une attente. */
export const Spinner = ({ tone = 'light', className = 'w-4 h-4' }) => (
  <span className={`spinner inline-block shrink-0 rounded-full border-2 animate-spin ${TONES[tone]} ${className}`} aria-hidden="true" />
);

/** Contenu d'un bouton : cercle + texte d'attente, ou texte normal. */
export const BusyLabel = ({ busy, busyText, children, tone = 'light' }) => (
  busy ? (
    <span className="inline-flex items-center gap-2">
      <Spinner tone={tone} />
      {busyText}
    </span>
  ) : children
);

/**
 * Attente de plusieurs secondes : barre animée et étapes qui défilent (la
 * dernière reste jusqu'à la fin). Annoncée aux lecteurs d'écran.
 */
export const WaitingPanel = ({ steps, stepMs = 2500, className = '' }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    const timer = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), stepMs);
    return () => clearInterval(timer);
  }, [steps, stepMs]);

  return (
    <div className={`p-4 rounded-xl bg-purple-50 border border-purple-100 ${className}`} role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold text-purple-900">
        <Spinner tone="dark" />
        <span key={step} className="ai-step">{steps[step]}</span>
      </p>
      <div className="ai-bar mt-3 h-1.5 overflow-hidden rounded-full bg-purple-100" aria-hidden="true"><span /></div>
    </div>
  );
};

export default Spinner;
