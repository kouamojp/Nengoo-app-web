import React, { useEffect, useId, useRef, useState } from 'react';
import { Spinner } from '../ui/Spinner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

/**
 * Champ d'adresse avec suggestions (OpenStreetMap, via le backend) : choisir
 * une suggestion remplit aussi la ville, la région et les coordonnées GPS.
 * L'adresse peut toujours être saisie librement.
 */
const AddressAutocomplete = ({ value, onChange, onSelect, required, name = 'address' }) => {
  const listId = useId();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState('');
  // Pas de recherche juste après avoir choisi une suggestion
  const skipNext = useRef(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return undefined;
    }
    const query = (value || '').trim();
    if (query.length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/address-suggestions?q=${encodeURIComponent(query)}`);
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Suggestions indisponibles.');
        setItems(data.items || []);
        setError('');
        setSearched(query);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setError(e.message);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  // Clic en dehors : la liste se ferme
  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (item) => {
    skipNext.current = true;
    setOpen(false);
    setItems([]);
    onSelect(item);
  };

  const onKeyDown = (e) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && (items.length > 0 || error || searched);

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && setOpen(true)}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Ex. : Carrefour Bastos, Yaoundé"
        className="adm-input pr-10"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2" role="status" aria-label="Recherche d'adresses">
          <Spinner tone="dark" />
        </span>
      )}
      {showList && (
        <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {error ? (
            <p className="px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-600">Aucune adresse trouvée. Vous pouvez la saisir telle quelle.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Adresses proposées" className="max-h-72 overflow-y-auto py-1">
              {items.map((item, i) => (
                <li
                  key={`${item.latitude},${item.longitude},${i}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                  onMouseEnter={() => setActive(i)}
                  className={`px-3 py-2 cursor-pointer ${i === active ? 'bg-purple-50' : ''}`}
                >
                  <span className="block text-sm font-semibold text-gray-900">{item.address}</span>
                  <span className="block text-xs text-gray-600">{[item.city, item.region].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="px-3 py-1.5 border-t border-gray-100 text-[0.7rem] text-gray-500">
            Données © contributeurs OpenStreetMap
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
