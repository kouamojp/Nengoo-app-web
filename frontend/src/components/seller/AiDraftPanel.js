import React, { useEffect, useState } from 'react';
import { isArticle, isMeal, isService } from '../../lib/productRules';

// Étapes affichées pendant la génération : la dernière reste jusqu'à la réponse
const STEPS = [
  'Analyse de la photo…',
  'Rédaction du titre et de la description…',
  'Choix des caractéristiques…',
];
const STEP_MS = 3500;

/** Animation d'attente : étoile, étapes, barre et lignes de fiche en cours d'écriture. */
const AiThinking = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="mt-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium text-purple-900">
        <svg className="ai-sparkle h-5 w-5 shrink-0 text-purple-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
        </svg>
        <span key={step} className="ai-step">{STEPS[step]}</span>
      </div>
      <div className="ai-bar mt-3 h-1.5 overflow-hidden rounded-full bg-purple-100" aria-hidden="true"><span /></div>
      <div className="mt-3 space-y-2" aria-hidden="true">
        <div className="ai-shimmer h-3 w-2/3 rounded" />
        <div className="ai-shimmer h-3 w-full rounded" />
        <div className="ai-shimmer h-3 w-5/6 rounded" />
      </div>
    </div>
  );
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
// Le serveur lit les 3 premières photos (déjà sur la médiathèque) et les réduit lui-même
const MAX_PHOTOS = 3;

/**
 * Brouillon de fiche par l'IA : à partir des photos, du prix et de la catégorie,
 * propose titre, description et caractéristiques. Rien n'est publié : onDraft
 * reçoit le brouillon, le formulaire le montre au vendeur qui le vérifie.
 */
const AiDraftPanel = ({ product, imageUrls = [], language = 'fr', onDraft }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const photos = imageUrls.filter(Boolean).slice(0, MAX_PHOTOS);
  const price = Number(product.price) || 0;
  const missing = [
    !photos.length && 'une photo',
    price <= 0 && 'le prix',
    !product.category && 'la catégorie',
  ].filter(Boolean);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/products/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: photos,
          price,
          category: product.category,
          kind: isService(product) ? 'service' : isMeal(product) ? 'meal' : 'product',
          language: language === 'en' ? 'en' : 'fr',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'La rédaction automatique a échoué. Réessayez.');
      }
      onDraft(data);
    } catch (e) {
      setError(e.message || 'La rédaction automatique a échoué. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-purple-200 bg-purple-50 p-4" aria-labelledby="ai-draft-title">
      <h3 id="ai-draft-title" className="font-semibold text-purple-950">Rédiger la fiche avec l'IA</h3>
      <p className="mt-1 text-sm text-gray-700">
        À partir de la photo, du prix et de la catégorie, l'IA propose le titre, la description et les
        caractéristiques. Vous relisez et corrigez avant de publier.
        {imageUrls.length > MAX_PHOTOS && ` Seules les ${MAX_PHOTOS} premières photos sont analysées.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={loading || missing.length > 0}
          className="adm-btn adm-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading ? 'Rédaction en cours…' : 'Générer la fiche'}
        </button>
        {missing.length > 0 && !loading && (
          <span className="text-sm text-gray-600">Ajoutez d'abord {missing.join(', ')}.</span>
        )}
        {loading && <span className="text-sm text-gray-600">Cela prend une dizaine de secondes.</span>}
      </div>
      {loading && <AiThinking />}
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
};

/** Champs du formulaire remplis par le brouillon (prix et catégorie inchangés). */
export const applyDraft = (product, draft) => ({
  ...product,
  name: draft.name || product.name,
  description: draft.description || product.description,
  specList: Object.entries(draft.specs || {}),
  brand: draft.brand || '',
  condition: !isArticle(product) ? '' : (draft.condition || product.condition || ''),
  colors: !isArticle(product) ? [] : (draft.colors?.length ? draft.colors : product.colors),
});

export default AiDraftPanel;
