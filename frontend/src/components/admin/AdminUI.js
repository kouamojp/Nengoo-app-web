import React, { useEffect, useId } from 'react';
import { statusLabel } from './adminFeedback';

// Briques de mise en page communes aux écrans de l'administration.

export const SectionHeader = ({ title, count, description, actions }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 className="adm-title">
        {title}
        {typeof count === 'number' && <span className="ml-2 text-lg font-semibold text-gray-500 tabular-nums">{count}</span>}
      </h2>
      {description && <p className="adm-subtitle">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Toolbar = ({ children }) => (
  <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>
);

export const SearchInput = ({ value, onChange, placeholder, label }) => (
  <input
    type="search"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    aria-label={label || placeholder}
    className="adm-input flex-1 min-w-[14rem] max-w-md"
  />
);

// Barre affichée seulement quand des lignes sont cochées
export const SelectionBar = ({ count, onDelete, onClear, deleteLabel = 'Supprimer' }) => (
  count > 0 ? (
    <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-purple-950 text-white" role="region" aria-label="Sélection">
      <span className="font-semibold">{count} sélectionné{count > 1 ? 's' : ''}</span>
      <button type="button" onClick={onClear} className="!min-h-0 text-sm text-purple-200 hover:text-white underline underline-offset-4">
        Tout désélectionner
      </button>
      <button type="button" onClick={onDelete} className="adm-btn adm-btn-danger ml-auto">
        {deleteLabel}
      </button>
    </div>
  ) : null
);

const STATUS_STYLES = {
  approved: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-900',
  processing: 'bg-purple-100 text-purple-900',
  shipped: 'bg-purple-100 text-purple-900',
  suspended: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

export const statusClass = (status) => STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';

export const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass(status)}`}>
    {statusLabel(status)}
  </span>
);

// Liste déroulante de statut, colorée selon la valeur
export const StatusSelect = ({ value, onChange, options, label = 'Statut' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label={label}
    className={`!min-h-0 h-9 pl-3 pr-8 rounded-full text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 ${statusClass(value)}`}
  >
    {options.map(opt => <option key={opt} value={opt}>{statusLabel(opt)}</option>)}
  </select>
);

export const EmptyRow = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-600">{children}</td>
  </tr>
);

export const LoadingRows = ({ colSpan, rows = 5 }) => (
  [...Array(rows)].map((_, i) => (
    <tr key={i}>
      <td colSpan={colSpan} className="px-4 py-3"><div className="h-8 rounded loading-shimmer" /></td>
    </tr>
  ))
);

export const Modal = ({ title, onClose, children, size = 'max-w-2xl' }) => {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="adm-backdrop" onClick={onClose}>
      <div className={`adm-modal ${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 id={titleId} className="adm-modal-title">{title}</h2>
          <button type="button" onClick={onClose} className="adm-close -mt-1 -mr-2" aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Champ de formulaire avec libellé visible (remplace les placeholders utilisés comme libellés)
export const Field = ({ label, hint, required, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="adm-label">{label}{required && <span className="text-red-600" aria-hidden="true"> *</span>}</span>
    {children}
    {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
  </label>
);

// Choix exclusif présenté en cartes (ex. URL d'image ou fichier)
export const ChoiceCards = ({ name, value, onChange, options }) => (
  <div className="grid sm:grid-cols-2 gap-2" role="radiogroup">
    {options.map(opt => {
      const checked = value === opt.value;
      return (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
            checked ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input type="radio" name={name} value={opt.value} checked={checked} onChange={(e) => onChange(e.target.value)} className="mt-1 accent-purple-700" />
          <span>
            <span className="block text-sm font-semibold">{opt.label}</span>
            {opt.hint && <span className="block text-xs text-gray-600 mt-0.5">{opt.hint}</span>}
          </span>
        </label>
      );
    })}
  </div>
);

export const formatXAF = (price) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
  minimumFractionDigits: 0,
}).format(price || 0);
