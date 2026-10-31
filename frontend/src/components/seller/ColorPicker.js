import React, { useState } from 'react';

// Couleurs proposées d'un clic ; les autres se choisissent avec le nuancier
const PRESETS = [
  { hex: '#000000', label: 'Noir' },
  { hex: '#ffffff', label: 'Blanc' },
  { hex: '#6b7280', label: 'Gris' },
  { hex: '#dc2626', label: 'Rouge' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#facc15', label: 'Jaune' },
  { hex: '#16a34a', label: 'Vert' },
  { hex: '#2563eb', label: 'Bleu' },
  { hex: '#7e22ce', label: 'Violet' },
  { hex: '#ec4899', label: 'Rose' },
  { hex: '#92400e', label: 'Marron' },
  { hex: '#d6c4a8', label: 'Beige' },
];

const MAX_COLORS = 12;

/**
 * Sélection des couleurs disponibles d'un produit (champ `colors`, #rrggbb).
 */
const ColorPicker = ({ value = [], onChange }) => {
  const [custom, setCustom] = useState('#7e22ce');
  const colors = value.map((c) => c.toLowerCase());

  const toggle = (hex) => {
    const c = hex.toLowerCase();
    if (colors.includes(c)) {
      onChange(colors.filter((x) => x !== c));
    } else if (colors.length < MAX_COLORS) {
      onChange([...colors, c]);
    }
  };

  return (
    <div>
      <span className="block text-sm font-medium mb-2">
        Couleurs disponibles <span className="text-gray-500 font-normal">(facultatif)</span>
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Couleurs proposées">
        {PRESETS.map(({ hex, label }) => {
          const selected = colors.includes(hex);
          return (
            <button
              key={hex}
              type="button"
              onClick={() => toggle(hex)}
              aria-pressed={selected}
              title={label}
              className={`w-9 h-9 rounded-full border-2 transition ${
                selected ? 'border-purple-700 ring-2 ring-purple-300' : 'border-gray-300'
              }`}
              style={{ backgroundColor: hex }}
            >
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <input
          type="color"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          aria-label="Autre couleur"
          className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
        />
        <button
          type="button"
          onClick={() => toggle(custom)}
          disabled={colors.includes(custom.toLowerCase()) || colors.length >= MAX_COLORS}
          className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Ajouter cette couleur
        </button>
      </div>

      {colors.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-3" aria-label="Couleurs sélectionnées">
          {colors.map((c) => (
            <li key={c} className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-full bg-gray-100 text-sm">
              <span className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: c }} />
              <span className="font-mono">{c}</span>
              <button
                type="button"
                onClick={() => toggle(c)}
                className="ml-1 text-gray-500 hover:text-red-600"
                aria-label={`Retirer ${c}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ColorPicker;
