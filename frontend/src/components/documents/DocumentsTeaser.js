import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, TEXT } from '../../lib/documents';
import { BookIcon } from '../ui/Icons';

const LABELS = {
  fr: { cta: 'Voir les documents' },
  en: { cta: 'See documents' },
};

/** Entrée vers la boutique de documents (accueil) ; rien tant qu'aucun document n'est en ligne. */
const DocumentsTeaser = ({ language = 'fr' }) => {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api('/documents?limit=1'), api('/documents/filters')])
      .then(([list, filters]) => !cancelled && list.total > 0 && setInfo({ total: list.total, free: filters.freeDownloads }))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!info) return null;
  const l = LABELS[language] || LABELS.fr;
  return (
    <div className="container mx-auto px-4 pt-10 lg:pt-14">
      <Link
        to="/documents"
        className="on-dark flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-purple-950 text-white hover:bg-purple-900 transition-colors"
      >
        <span className="shrink-0 w-12 h-12 rounded-full bg-yellow-300 text-purple-950 flex items-center justify-center" aria-hidden="true">
          <BookIcon className="w-6 h-6" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-lg font-extrabold">{(TEXT[language] || TEXT.fr).label}</span>
          <span className="block text-sm text-purple-200">{TEXT[language]?.intro(info.free) || TEXT.fr.intro(info.free)}</span>
        </span>
        <span className="hidden sm:inline shrink-0 font-semibold text-yellow-300">{l.cta} →</span>
      </Link>
    </div>
  );
};

export default DocumentsTeaser;
