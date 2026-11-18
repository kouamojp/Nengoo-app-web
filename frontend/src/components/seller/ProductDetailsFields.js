import React, { useId } from 'react';
import { MEAL_ORDERS, PRODUCT_CONDITIONS, PRODUCT_KINDS, isArticle, isMeal, isService, withKind } from '../../lib/productRules';

// Marque, état et caractéristiques d'un produit (formulaires vendeur et admin).
// Les caractéristiques sont des paires libres « Taille : M », « Matière : Coton »,
// gardées en liste (specList) pendant la saisie : voir withSpecList().
// Exemples de valeurs pour les caractéristiques proposées d'un plat
const MEAL_SPEC_EXAMPLES = {
  Portion: 'Pour 1 personne',
  Accompagnement: 'Miondo, plantain ou riz',
  'Temps de préparation': '30 min',
  Piment: 'À part, sur demande',
};

const ProductDetailsFields = ({ value, onChange }) => {
  const id = useId();
  const specs = value.specList || [];
  const setSpecs = (pairs) => onChange({ ...value, specList: pairs });
  const updateSpec = (index, key, val) =>
    setSpecs(specs.map((pair, i) => (i === index ? [key, val] : pair)));

  return (
    <div className="space-y-4">
      {/* Un plat n'a ni marque ni état */}
      {!isMeal(value) && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        {isArticle(value) && <div>
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
      </div>}

      <fieldset>
        <legend className="adm-label">Caractéristiques</legend>
        {isMeal(value) && (
          <p className="-mt-1 mb-2 text-xs text-gray-500">Remplissez celles qui comptent pour ce plat : les lignes laissées vides ne s'affichent pas.</p>
        )}
        <div className="space-y-2">
          {specs.map(([key, val], index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={key}
                onChange={(e) => updateSpec(index, e.target.value, val)}
                placeholder={isMeal(value) ? 'Portion' : 'Taille'}
                aria-label="Nom de la caractéristique"
                className="adm-input flex-1"
              />
              <input
                type="text"
                value={val}
                onChange={(e) => updateSpec(index, key, e.target.value)}
                placeholder={isMeal(value) ? (MEAL_SPEC_EXAMPLES[key] || 'Pour 1 personne') : 'M'}
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

/** Cartes à choix unique : type d'annonce, mode de commande d'un plat. */
const ChoiceCards = ({ legend, name, options, current, onPick, columns }) => (
  <fieldset>
    <legend className="adm-label">{legend}</legend>
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const checked = current === option.value;
        return (
          <label
            key={option.value}
            className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              checked ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-gray-300 bg-white hover:border-purple-400'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onPick(option.value)}
              className="mt-1 accent-purple-700"
            />
            <span>
              <span className="block font-semibold text-gray-900">{option.label}</span>
              <span className="block text-sm text-gray-600">{option.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  </fieldset>
);

/**
 * Type d'annonce, en tête des formulaires. « Plat » seulement pour un
 * restaurant (restaurant), ou pour une annonce qui est déjà un plat.
 */
export const ProductKindField = ({ value, onChange, restaurant = false }) => {
  const id = useId();
  const current = isService(value) ? 'service' : isMeal(value) ? 'meal' : 'product';
  const kinds = PRODUCT_KINDS.filter((kind) => !kind.restaurantOnly || restaurant || current === kind.value);
  return (
    <div className="space-y-4">
      <ChoiceCards
        legend="Type d'annonce"
        name={`${id}-kind`}
        options={kinds}
        current={current}
        columns={kinds.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}
        onPick={(kind) => onChange(withKind(value, kind))}
      />
      {current === 'meal' && (
        <ChoiceCards
          legend="Comment se commande ce plat ?"
          name={`${id}-meal-order`}
          options={MEAL_ORDERS}
          current={value.mealOrder === 'whatsapp' ? 'whatsapp' : 'online'}
          columns="sm:grid-cols-2"
          onPick={(mealOrder) => onChange({ ...value, mealOrder })}
        />
      )}
    </div>
  );
};

export default ProductDetailsFields;
