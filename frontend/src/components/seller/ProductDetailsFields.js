import React, { useId } from 'react';
import { PRODUCT_CONDITIONS, PRODUCT_KINDS, isService } from '../../lib/productRules';

// Marque, état et caractéristiques d'un produit (formulaires vendeur et admin).
// Les caractéristiques sont des paires libres « Taille : M », « Matière : Coton »,
// gardées en liste (specList) pendant la saisie : voir withSpecList().
const ProductDetailsFields = ({ value, onChange }) => {
  const id = useId();
  const specs = value.specList || [];
  const setSpecs = (pairs) => onChange({ ...value, specList: pairs });
  const updateSpec = (index, key, val) =>
    setSpecs(specs.map((pair, i) => (i === index ? [key, val] : pair)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="adm-label" htmlFor={`${id}-brand`}>Marque</label>
          <input
            id={`${id}-brand`}
            type="text"
            value={value.brand || ''}
            onChange={(e) => onChange({ ...value, brand: e.target.value })}
            placeholder="Ex. : Samsung, Zara, artisanal"
            className="adm-input"
          />
        </div>
        {!isService(value) && <div>
          <label className="adm-label" htmlFor={`${id}-condition`}>État</label>
          <select
            id={`${id}-condition`}
            value={value.condition || ''}
            onChange={(e) => onChange({ ...value, condition: e.target.value })}
            className="adm-input"
          >
            <option value="">Non précisé</option>
            {PRODUCT_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>}
      </div>

      <fieldset>
        <legend className="adm-label">Caractéristiques</legend>
        <div className="space-y-2">
          {specs.map(([key, val], index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={key}
                onChange={(e) => updateSpec(index, e.target.value, val)}
                placeholder="Taille"
                aria-label="Nom de la caractéristique"
                className="adm-input flex-1"
              />
              <input
                type="text"
                value={val}
                onChange={(e) => updateSpec(index, key, e.target.value)}
                placeholder="M"
                aria-label="Valeur"
                className="adm-input flex-1"
              />
              <button
                type="button"
                onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                className="adm-link-danger !min-h-0 px-2"
                aria-label={`Retirer ${key || 'cette caractéristique'}`}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSpecs([...specs, ['', '']])}
          className="adm-link !min-h-0 mt-2"
        >
          Ajouter une caractéristique
        </button>
      </fieldset>
    </div>
  );
};

/** Choix entre produit et service, en tête des formulaires. */
export const ProductKindField = ({ value, onChange }) => {
  const id = useId();
  const current = isService(value) ? 'service' : 'product';
  return (
    <fieldset>
      <legend className="adm-label">Type d'annonce</legend>
      <div className="grid sm:grid-cols-2 gap-2">
        {PRODUCT_KINDS.map((kind) => {
          const checked = current === kind.value;
          return (
            <label
              key={kind.value}
              className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                checked ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-gray-300 bg-white hover:border-purple-400'
              }`}
            >
              <input
                type="radio"
                name={`${id}-kind`}
                value={kind.value}
                checked={checked}
                onChange={() => onChange({ ...value, kind: kind.value })}
                className="mt-1 accent-purple-700"
              />
              <span>
                <span className="block font-semibold text-gray-900">{kind.label}</span>
                <span className="block text-sm text-gray-600">{kind.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default ProductDetailsFields;
