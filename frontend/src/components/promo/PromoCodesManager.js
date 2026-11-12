import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { notify, confirmAction } from '../admin/adminFeedback';
import { EmptyRow, LoadingRows, Modal, Field } from '../admin/AdminUI';
import { errorText } from '../../lib/support';
import { numberFormat } from '../../lib/numberFormat';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const formatPrice = (price) =>
  numberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(price || 0);

// Le serveur stocke des dates UTC sans fuseau ; le formulaire travaille en heure locale
const parseDate = (value) => (value ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`) : null);
const toLocalInput = (value) => {
  const date = parseDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);
const shortDate = (value) => parseDate(value)?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const STATES = {
  running: { label: 'En cours', className: 'bg-green-100 text-green-800' },
  scheduled: { label: 'Programmé', className: 'bg-purple-100 text-purple-900' },
  ended: { label: 'Terminé', className: 'bg-gray-100 text-gray-700' },
  paused: { label: 'Désactivé', className: 'bg-yellow-100 text-yellow-900' },
};

const EMPTY = {
  code: '', description: '', type: 'percent', value: 10, maxDiscount: '', minOrder: '',
  startsAt: '', endsAt: '', maxUses: '', perCustomer: 1, active: true, sellerId: '', categories: [],
};

const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

/** Formulaire d'un code (création ou modification). */
const PromoForm = ({ initial, isTeam, sellers, categories, apiBase, onClose, onSaved }) => {
  const [form, setForm] = useState(() => (initial ? {
    ...EMPTY, ...initial,
    maxDiscount: initial.maxDiscount ?? '', minOrder: initial.minOrder ?? '', maxUses: initial.maxUses ?? '',
    perCustomer: initial.perCustomer ?? '', sellerId: initial.sellerId || '',
    startsAt: toLocalInput(initial.startsAt), endsAt: toLocalInput(initial.endsAt),
  } : EMPTY));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      code: form.code, description: form.description, type: form.type,
      value: form.type === 'free_shipping' ? 0 : Number(form.value),
      maxDiscount: form.type === 'percent' ? numberOrNull(form.maxDiscount) : null,
      minOrder: numberOrNull(form.minOrder), maxUses: numberOrNull(form.maxUses),
      perCustomer: numberOrNull(form.perCustomer),
      startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt),
      active: form.active,
      ...(isTeam ? { sellerId: form.sellerId || null, categories: form.categories } : {}),
    };
    try {
      const response = await fetch(initial ? `${apiBase}/${encodeURIComponent(initial.id)}` : apiBase, {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await errorText(response, "L'enregistrement a échoué. Réessayez."));
      notify(initial ? 'Code promo mis à jour.' : 'Code promo créé.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? `Modifier ${initial.code}` : 'Nouveau code promo'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Code" required hint="Ce que le client saisit : lettres, chiffres, - ou _.">
            <input value={form.code} onChange={set('code')} required minLength={3} maxLength={30}
              className="adm-input uppercase" placeholder="BIENVENUE10" autoComplete="off" />
          </Field>
          <Field label="Note" hint="Pour vous retrouver (non visible des clients).">
            <input value={form.description} onChange={set('description')} maxLength={160} className="adm-input" />
          </Field>
        </div>

        <fieldset>
          <legend className="adm-label">Réduction</legend>
          <div className="flex flex-wrap gap-2">
            {[['percent', 'Pourcentage'], ['fixed', 'Montant fixe'], ['free_shipping', 'Livraison offerte']].map(([value, label]) => (
              <label key={value} className={`h-10 px-4 inline-flex items-center gap-2 rounded-full border text-sm font-semibold cursor-pointer ${form.type === value ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-300'}`}>
                <input type="radio" name="type" value={value} checked={form.type === value} onChange={set('type')} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {form.type !== 'free_shipping' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={form.type === 'percent' ? 'Pourcentage (%)' : 'Montant (XAF)'} required>
              <input type="number" min={1} max={form.type === 'percent' ? 90 : undefined} step="any"
                value={form.value} onChange={set('value')} required className="adm-input" />
            </Field>
            {form.type === 'percent' && (
              <Field label="Réduction maximale (XAF)" hint="Facultatif : plafond de la réduction.">
                <input type="number" min={1} value={form.maxDiscount} onChange={set('maxDiscount')} className="adm-input" />
              </Field>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Achat minimum (XAF)" hint="Sur les articles concernés par le code.">
            <input type="number" min={0} value={form.minOrder} onChange={set('minOrder')} className="adm-input" />
          </Field>
          <Field label="Utilisations au total" hint="Vide : sans limite.">
            <input type="number" min={1} value={form.maxUses} onChange={set('maxUses')} className="adm-input" />
          </Field>
          <Field label="Utilisations par client" hint="Vide : sans limite.">
            <input type="number" min={1} value={form.perCustomer} onChange={set('perCustomer')} className="adm-input" />
          </Field>
          <div />
          <Field label="Début" hint="Vide : tout de suite.">
            <input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} className="adm-input" />
          </Field>
          <Field label="Fin" hint="Vide : sans date de fin.">
            <input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} className="adm-input" />
          </Field>
        </div>

        {isTeam && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Limiter à une boutique" hint="Vide : tout le catalogue. Réduction financée par Nengoo.">
              <select value={form.sellerId} onChange={set('sellerId')} className="adm-input">
                <option value="">Toutes les boutiques</option>
                {sellers.map((s) => <option key={s.id} value={s.id}>{s.businessName || s.name}</option>)}
              </select>
            </Field>
            <Field label="Limiter à des catégories" hint="Ctrl ou Cmd pour en choisir plusieurs. Aucune : toutes.">
              <select multiple value={form.categories} className="adm-input h-28"
                onChange={(e) => setForm((f) => ({ ...f, categories: Array.from(e.target.selectedOptions, (o) => o.value) }))}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.active} onChange={set('active')} className="h-5 w-5" />
          Code actif
        </label>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="adm-btn adm-btn-secondary">Annuler</button>
          <button type="submit" disabled={saving} className="adm-btn adm-btn-primary">
            {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer le code'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Liste et gestion des codes promo.
 * isTeam : codes de l'équipe (tous les codes listés, ceux des vendeurs compris) ;
 * sinon les codes du vendeur connecté, valables sur sa boutique seulement.
 */
const PromoCodesManager = ({ isTeam = false, header }) => {
  const apiBase = `${API_BASE_URL}/${isTeam ? 'admin' : 'seller'}/promo-codes`;
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | code
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiBase);
      if (!response.ok) throw new Error(await errorText(response, 'Chargement impossible. Réessayez.'));
      setCodes(await response.json());
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!isTeam) return;
    fetch(`${API_BASE_URL}/sellers`).then((r) => (r.ok ? r.json() : [])).then(setSellers).catch(() => {});
    fetch(`${API_BASE_URL}/categories`).then((r) => (r.ok ? r.json() : [])).then(setCategories).catch(() => {});
  }, [isTeam]);

  const sellerName = useMemo(
    () => Object.fromEntries(sellers.map((s) => [s.id, s.businessName || s.name])), [sellers]);

  const remove = async (code) => {
    const ok = await confirmAction({
      title: `Supprimer le code ${code.code} ?`,
      message: 'Les clients ne pourront plus l\'utiliser. Les commandes déjà passées gardent leur réduction.',
    });
    if (!ok) return;
    try {
      const response = await fetch(`${apiBase}/${encodeURIComponent(code.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await errorText(response, 'La suppression a échoué.'));
      notify('Code promo supprimé.', 'success');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const columns = isTeam ? 7 : 6;

  return (
    <div>
      {header(codes.length, (
        <button type="button" onClick={() => setEditing('new')} className="adm-btn adm-btn-primary">Nouveau code</button>
      ))}

      <div className="adm-card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="adm-th">Code</th>
              <th className="adm-th">Réduction</th>
              {isTeam && <th className="adm-th">Financé par</th>}
              <th className="adm-th">Validité</th>
              <th className="adm-th text-right">Utilisations</th>
              <th className="adm-th text-right">Réductions accordées</th>
              <th className="adm-th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <LoadingRows colSpan={columns} />
            ) : codes.length === 0 ? (
              <EmptyRow colSpan={columns}>
                Aucun code promo. Créez-en un pour offrir une réduction à saisir au moment de commander.
              </EmptyRow>
            ) : codes.map((c) => {
              const state = STATES[c.state] || STATES.ended;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="adm-td">
                    <p className="font-bold font-mono tracking-wide">{c.code}</p>
                    {c.description && <p className="text-xs text-gray-500 max-w-[14rem] truncate">{c.description}</p>}
                  </td>
                  <td className="adm-td">
                    {c.label}
                    {c.minOrder ? <p className="text-xs text-gray-500">dès {formatPrice(c.minOrder)}</p> : null}
                  </td>
                  {isTeam && (
                    <td className="adm-td">
                      {c.ownerType === 'seller' ? (sellerName[c.sellerId] || 'Vendeur') : 'Nengoo'}
                      {c.ownerType === 'platform' && c.sellerId && (
                        <p className="text-xs text-gray-500">sur {sellerName[c.sellerId] || 'une boutique'}</p>
                      )}
                    </td>
                  )}
                  <td className="adm-td">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${state.className}`}>{state.label}</span>
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {c.startsAt ? `du ${shortDate(c.startsAt)} ` : ''}{c.endsAt ? `au ${shortDate(c.endsAt)}` : ''}
                    </p>
                  </td>
                  <td className="adm-td text-right tabular-nums">
                    {c.usedCount || 0}{c.maxUses ? ` / ${c.maxUses}` : ''}
                  </td>
                  <td className="adm-td text-right tabular-nums">{formatPrice(c.totalDiscount)}</td>
                  <td className="adm-td whitespace-nowrap text-right">
                    {(isTeam ? c.ownerType === 'platform' : true) && (
                      <button type="button" onClick={() => setEditing(c)} className="adm-link !min-h-0">Modifier</button>
                    )}
                    <button type="button" onClick={() => remove(c)} className="adm-link-danger !min-h-0 ml-4">Supprimer</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <PromoForm
          initial={editing === 'new' ? null : editing}
          isTeam={isTeam}
          sellers={sellers}
          categories={categories}
          apiBase={apiBase}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default PromoCodesManager;
