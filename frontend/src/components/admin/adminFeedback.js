import React, { useState, useEffect, useRef, useCallback } from 'react';

// Retours de l'admin : notifications et confirmations dans l'interface, à la place de alert() et confirm().
// Les écrans appellent notify() / confirmAction() ; l'hôte rendu par AdminLayout les affiche.

let host = null;

export const notify = (message, type = 'success') => {
  if (host) host.notify(message, type);
  else window.alert(message);
};

export const confirmAction = (options) => {
  const opts = typeof options === 'string' ? { message: options } : options;
  if (host) return host.confirm(opts);
  return Promise.resolve(window.confirm(opts.message));
};

// Libellés des statuts pour les messages de confirmation
const STATUS_LABELS = {
  approved: 'Approuvé',
  suspended: 'Suspendu',
  pending: 'En attente',
  active: 'Actif',
  inactive: 'Inactif',
  rejected: 'Refusé',
  processing: 'En cours',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const statusLabel = (status) => STATUS_LABELS[status] || status;

const TOAST_DURATION = { success: 4000, error: 8000 };

export const AdminFeedbackHost = () => {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const cancelRef = useRef(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const api = {
      notify: (message, type) => {
        const id = ++nextId.current;
        // Un même message déjà affiché n'est pas répété (ex. deux chargements qui échouent ensemble)
        setToasts(list => (list.some(t => t.message === message) ? list : [...list.slice(-3), { id, message, type }]));
        setTimeout(() => dismiss(id), TOAST_DURATION[type] || 5000);
      },
      confirm: (opts) => new Promise(resolve => setDialog({ ...opts, resolve })),
    };
    host = api;
    return () => { if (host === api) host = null; };
  }, [dismiss]);

  const close = useCallback((result) => {
    setDialog(current => {
      if (current) current.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <>
      <div className="fixed z-[70] bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 space-y-2" aria-live="polite">
        {toasts.map(toast => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 p-4 rounded-xl text-sm shadow-[0_12px_32px_-12px_rgba(59,7,100,0.45)] ${
              toast.type === 'error' ? 'bg-red-700 text-white' : 'bg-purple-950 text-white'
            }`}
          >
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Fermer"
              className="!min-h-0 !min-w-0 -m-1 w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="adm-backdrop z-[80]" onClick={() => close(false)}>
          <div
            className="adm-modal max-w-md"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="adm-modal-title">{dialog.title || 'Confirmer'}</h2>
            <p id="confirm-message" className="mt-2 text-gray-700">{dialog.message}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button ref={cancelRef} type="button" onClick={() => close(false)} className="adm-btn adm-btn-secondary">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`adm-btn ${dialog.danger === false ? 'adm-btn-primary' : 'adm-btn-danger'}`}
              >
                {dialog.confirmLabel || 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
