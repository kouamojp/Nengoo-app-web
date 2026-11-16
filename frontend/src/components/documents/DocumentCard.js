import React from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel, formatFCFA, TEXT } from '../../lib/documents';

// Couleur de couverture par catégorie (pas de miniature générée pour les PDF)
const COVER = {
  cours: 'bg-purple-800',
  examens: 'bg-purple-950',
  corriges: 'bg-emerald-800',
  exercices: 'bg-sky-800',
  fiches: 'bg-amber-800',
  guides: 'bg-teal-800',
  documentation: 'bg-slate-700',
  recherches: 'bg-indigo-900',
  memoires: 'bg-stone-700',
  autres: 'bg-gray-700',
};

/** Couverture : image si l'équipe en a fourni une, sinon matière, niveau et année. */
export const DocumentCover = ({ doc, language, large = false, compact = false }) => {
  if (doc.coverImage) {
    return <img src={doc.coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />;
  }
  if (compact) {
    return (
      <div className={`w-full h-full ${COVER[doc.category] || COVER.autres} text-white flex items-center justify-center text-xs font-bold`}>
        PDF
      </div>
    );
  }
  return (
    <div className={`on-dark w-full h-full ${COVER[doc.category] || COVER.autres} text-white p-4 flex flex-col justify-between`}>
      <span className="text-[0.7rem] font-bold uppercase tracking-wider text-white/75">{categoryLabel(doc, language)}</span>
      <span>
        {doc.subject && <span className={`block font-display leading-tight ${large ? 'text-3xl' : 'text-xl'}`}>{doc.subject}</span>}
        <span className="block mt-1 text-sm text-white/85">{[doc.level, doc.year].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="text-xs font-semibold text-white/70">PDF{doc.pages ? ` · ${TEXT[language].pages(doc.pages)}` : ''}</span>
    </div>
  );
};

const DocumentCard = ({ doc, language }) => {
  const t = TEXT[language];
  return (
    <Link
      to={`/documents/${doc.slug || doc.id}`}
      className="group flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-purple-300 hover:shadow-md transition"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <DocumentCover doc={doc} language={language} />
      </div>
      <div className="flex-1 flex flex-col p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-purple-800">{doc.title}</h3>
        <p className="mt-1 text-xs text-gray-600">{[doc.level, doc.year].filter(Boolean).join(' · ')}</p>
        <p className={`price mt-auto pt-2 ${doc.isFree ? 'text-emerald-700' : 'text-purple-800'}`}>
          {doc.isFree ? t.free : formatFCFA(doc.price)}
        </p>
      </div>
    </Link>
  );
};

export default DocumentCard;
