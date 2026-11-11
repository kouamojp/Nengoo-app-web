import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionHeader, Toolbar, EmptyRow, LoadingRows, Modal, Field } from './AdminUI';
import { notify, confirmAction } from './adminFeedback';
import { topLevelCategories, subcategoriesOf } from '../../lib/categories';
import { numberFormat } from '../../lib/numberFormat';

// Bannières publicitaires (backend/routers/ads.py)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const ADMIN_API = `${API_BASE_URL}/admin/promotions`;

const PHASES = {
  running: { label: 'En ligne', className: 'bg-green-100 text-green-800' },
  scheduled: { label: 'Programmée', className: 'bg-purple-100 text-purple-900' },
  paused: { label: 'En pause', className: 'bg-yellow-100 text-yellow-900' },
  ended: { label: 'Terminée', className: 'bg-gray-100 text-gray-700' },
};

const EMPTY = {
  title: '',
  advertiser: '',
  sellerId: '',
  placement: 'home_middle',
  imageDesktop: '',
  imageMobile: '',
  alt: '',
  link: '',
  startsAt: '',
  endsAt: '',
  categories: [],
  weight: 1,
  status: 'active',
};

const isValidLink = (raw) => {
  const link = (raw || '').trim();
  return (link.startsWith('/') && !link.startsWith('//')) || /^https?:\/\/\S+$/i.test(link);
};

// Le serveur stocke en UTC sans fuseau
const parseUtc = (value) => (value ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`) : null);

const toLocalInput = (value) => {
  const date = parseUtc(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

const shortDate = (value) =>
  parseUtc(value)?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const number = (n) => numberFormat('fr-FR').format(n || 0);

const ctr = (views, clicks) =>
  views ? `${numberFormat('fr-FR', { maximumFractionDigits: 1 }).format((clicks / views) * 100)} %` : '—';

const errorText = async (response, fallback) => {
  const data = await response.json().catch(() => null);
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
  return fallback;
};

const PhaseBadge = ({ phase }) => {
  const info = PHASES[phase] || PHASES.ended;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${info.className}`}>
      {info.label}
    </span>
  );
};

const period = (ad) => {
  if (!ad.startsAt && !ad.endsAt) return 'Sans limite';
  if (!ad.endsAt) return `Dès le ${shortDate(ad.startsAt)}`;
  if (!ad.startsAt) return `Jusqu'au ${shortDate(ad.endsAt)}`;
  return `${shortDate(ad.startsAt)} – ${shortDate(ad.endsAt)}`;
};

// Envoi d'une image sur S3 (URL pré-signée, comme le carrousel d'accueil)
const uploadImage = async (file) => {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error('Format accepté : JPG, PNG, WebP ou GIF.');
  if (file.size > 3 * 1024 * 1024) throw new Error('Image trop lourde : 3 Mo au plus.');
  const presign = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name.replace(/[^\w.-]+/g, '-'), fileType: file.type }),
  });
  if (!presign.ok) throw new Error(await errorText(presign, "Impossible de préparer l'envoi de l'image."));
  const { uploadUrl, publicUrl } = await presign.json();
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!put.ok) throw new Error("L'envoi de l'image a échoué.");
  return publicUrl;
};

const readSize = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve([img.naturalWidth, img.naturalHeight]);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const ImageField = ({ id, label, size, value, onChange, required }) => {
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState('');
  const [w, h] = size;

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setWarning('');
    try {
      const actual = await readSize(file);
      if (actual && Math.abs(actual[0] / actual[1] - w / h) > 0.08 * (w / h)) {
        setWarning(`Image de ${actual[0]} × ${actual[1]} px : elle sera recadrée. Format conseillé : ${w} × ${h} px.`);
      }
      onChange(await uploadImage(file));
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span id={`${id}-label`} className="adm-label">
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
      </span>
      <div
        className="relative overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-gray-500">
            {w} × {h} px
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="adm-btn adm-btn-secondary cursor-pointer">
          {busy ? 'Envoi…' : value ? "Remplacer l'image" : 'Choisir une image'}
          <input
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            disabled={busy}
            aria-labelledby={`${id}-label`}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {value && !required && (
          <button type="button" onClick={() => onChange('')} className="adm-link-danger text-sm">
            Retirer
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">Format conseillé : {w} × {h} px, 3 Mo au plus.</p>
      {warning && <p className="mt-1 text-xs text-yellow-900" role="status">{warning}</p>}
    </div>
  );
};

const CategoryPicker = ({ categories, value, onChange }) => {
  const [query, setQuery] = useState('');
  const selected = new Set(value);
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };
  const q = query.trim().toLowerCase();
  const matches = (c) => !q || c.name.toLowerCase().includes(q);
  const groups = topLevelCategories(categories)
    .map((parent) => ({ parent, subs: subcategoriesOf(categories, parent.id).filter(matches) }))
    .filter(({ parent, subs }) => matches(parent) || subs.length);

  return (
    <fieldset>
      <legend className="adm-label">Catégories ciblées</legend>
      <p className="-mt-1 mb-2 text-xs text-gray-500">
        Aucune cochée : la bannière s'affiche sur tout le catalogue. Une catégorie principale couvre ses sous-catégories.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrer les catégories"
        aria-label="Filtrer les catégories"
        className="adm-input mb-2"
      />
      <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1">
        {groups.map(({ parent, subs }) => (
          <div key={parent.id}>
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 font-semibold">
              <input type="checkbox" checked={selected.has(parent.id)} onChange={() => toggle(parent.id)} />
              {parent.name}
            </label>
            {subs.map((sub) => (
              <label key={sub.id} className="flex items-center gap-2 pl-8 pr-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm">
                <input type="checkbox" checked={selected.has(sub.id) || selected.has(parent.id)} disabled={selected.has(parent.id)} onChange={() => toggle(sub.id)} />
                {sub.name}
              </label>
            ))}
          </div>
        ))}
        {!groups.length && <p className="px-2 py-3 text-sm text-gray-500">Aucune catégorie.</p>}
      </div>
      {value.length > 0 && (
        <p className="mt-1 text-xs text-gray-600">
          {value.length} catégorie{value.length > 1 ? 's' : ''} ciblée{value.length > 1 ? 's' : ''}.{' '}
          <button type="button" onClick={() => onChange([])} className="adm-link">Tout décocher</button>
        </p>
      )}
    </fieldset>
  );
};

const PromotionForm = ({ initial, placements, categories, sellers, onClose, onSaved }) => {
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...EMPTY,
          ...initial,
          sellerId: initial.sellerId || '',
          imageDesktop: initial.imageDesktop || '',
          imageMobile: initial.imageMobile || '',
          startsAt: toLocalInput(initial.startsAt),
          endsAt: toLocalInput(initial.endsAt),
          categories: initial.categories || [],
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const spec = placements.find((p) => p.id === form.placement) || placements[0];
  const appOnly = spec && !spec.desktop;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidLink(form.link)) {
      setError('Lien invalide : indiquez une page du site (/catalog/Mode) ou une adresse complète (https://…).');
      return;
    }
    if (appOnly ? !(form.imageMobile || form.imageDesktop) : !form.imageDesktop) {
      setError("Ajoutez l'image de la bannière.");
      return;
    }
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('La date de fin doit suivre la date de début.');
      return;
    }
    const seller = sellers.find((s) => s.id === form.sellerId);
    const body = {
      ...form,
      advertiser: form.advertiser.trim() || seller?.businessName || '',
      sellerId: form.sellerId || null,
      imageDesktop: appOnly ? null : form.imageDesktop || null,
      imageMobile: form.imageMobile || null,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      weight: Number(form.weight) || 1,
      categories: spec?.targetable ? form.categories : [],
    };
    delete body.id;
    delete body.phase;
    delete body.views;
    delete body.clicks;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.createdBy;
    setSaving(true);
    try {
      const response = await fetch(initial ? `${ADMIN_API}/${initial.id}` : ADMIN_API, {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await errorText(response, "La campagne n'a pas été enregistrée."));
      notify(initial ? 'Campagne enregistrée.' : 'Campagne créée.');
      onSaved(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? 'Modifier la campagne' : 'Nouvelle campagne'} onClose={onClose} size="max-w-3xl">
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Nom de la campagne" required hint="Pour vous retrouver dans la liste ; non affiché sur le site.">
            <input className="adm-input" required maxLength={120} value={form.title} onChange={set('title')} placeholder="Promo rentrée 2026" />
          </Field>
          <Field label="Emplacement" required>
            <select className="adm-input" value={form.placement} onChange={set('placement')}>
              {placements.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendeur annonceur" hint="Facultatif : si la campagne est payée par un vendeur.">
            <select className="adm-input" value={form.sellerId} onChange={set('sellerId')}>
              <option value="">Aucun (Nengoo ou partenaire)</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.businessName}</option>
              ))}
            </select>
          </Field>
          <Field label="Annonceur" hint="Nom affiché dans la liste. Par défaut, celui du vendeur.">
            <input className="adm-input" maxLength={120} value={form.advertiser} onChange={set('advertiser')} placeholder="Nengoo" />
          </Field>
        </div>

        <div className={`grid gap-5 ${appOnly ? '' : 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'}`}>
          {!appOnly && (
            <ImageField
              id="promo-desktop"
              label="Image grand écran"
              size={spec.desktop}
              value={form.imageDesktop}
              onChange={(url) => setForm((f) => ({ ...f, imageDesktop: url }))}
              required
            />
          )}
          <ImageField
            id="promo-mobile"
            label={appOnly ? "Image de la bannière" : 'Image mobile (facultative)'}
            size={spec.mobile}
            value={form.imageMobile}
            onChange={(url) => setForm((f) => ({ ...f, imageMobile: url }))}
            required={appOnly}
          />
        </div>
        {!appOnly && (
          <p className="-mt-3 text-xs text-gray-500">
            Sans image mobile, l'image grand écran est recadrée sur téléphone : gardez le texte au centre.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Lien au clic" required hint="Page du site (/catalog/Mode, /seller/…) ou adresse https://.">
            <input className="adm-input" required value={form.link} onChange={set('link')} placeholder="/catalog/Mode" />
          </Field>
          <Field label="Texte de l'image" required hint="Lu par les lecteurs d'écran : ce que dit la bannière.">
            <input className="adm-input" required maxLength={160} value={form.alt} onChange={set('alt')} placeholder="Fournitures scolaires à -20 % jusqu'au 30 septembre" />
          </Field>
          <Field label="Début" hint="Vide : dès l'enregistrement.">
            <input className="adm-input" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
          </Field>
          <Field label="Fin" hint="Vide : sans date de fin.">
            <input className="adm-input" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
          </Field>
          <Field label="Priorité" hint="Plusieurs campagnes au même endroit : une priorité 3 s'affiche trois fois plus souvent qu'une priorité 1.">
            <input className="adm-input" type="number" min="1" max="10" value={form.weight} onChange={set('weight')} />
          </Field>
          <Field label="Statut">
            <select className="adm-input" value={form.status} onChange={set('status')}>
              <option value="active">Active (en ligne pendant sa période)</option>
              <option value="paused">En pause</option>
            </select>
          </Field>
        </div>

        {spec?.targetable && (
          <CategoryPicker
            categories={categories}
            value={form.categories}
            onChange={(next) => setForm((f) => ({ ...f, categories: next }))}
          />
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="adm-btn adm-btn-primary">
            {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer la campagne'}
          </button>
          <button type="button" onClick={onClose} className="adm-btn adm-btn-secondary">Annuler</button>
        </div>
      </form>
    </Modal>
  );
};

// Barres quotidiennes d'une mesure (une seule série, un seul axe)
const DailyBars = ({ title, days, field, total }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d[field]));
  const dayLabel = (day) => new Date(`${day}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const active = hover !== null ? days[hover] : null;
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-gray-900">{title}</span>
        <span className="text-sm text-gray-600 tabular-nums" aria-live="polite">
          {active ? `${dayLabel(active.day)} : ${number(active[field])}` : `${number(total)} sur la période`}
        </span>
      </figcaption>
      <div className="mt-2 relative h-28 border-b border-gray-300" onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-200" aria-hidden="true" />
        <div className="absolute inset-0 flex items-end gap-[2px]" aria-hidden="true">
          {days.map((d, i) => (
            <div key={d.day} className="relative flex-1 h-full flex items-end" onMouseEnter={() => setHover(i)}>
              <div
                className={`w-full rounded-t-[4px] ${hover === i ? 'bg-purple-900' : 'bg-purple-600'}`}
                style={{ height: d[field] ? `${Math.max(3, (d[field] / max) * 100)}%` : 0 }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-500" aria-hidden="true">
        <span>{dayLabel(days[0].day)}</span>
        <span>{dayLabel(days[days.length - 1].day)}</span>
      </div>
    </figure>
  );
};

const StatsModal = ({ ad, onClose }) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    fetch(`${ADMIN_API}/${ad.id}/stats?days=${days}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await errorText(r, 'Statistiques indisponibles.'));
        return r.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [ad.id, days]);

  return (
    <Modal title={`Statistiques : ${ad.title}`} onClose={onClose} size="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2 mb-5" role="group" aria-label="Période">
        {[7, 30, 90].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setDays(n)}
            aria-pressed={days === n}
            className={`!min-h-0 h-9 px-4 rounded-full text-sm font-semibold ${days === n ? 'bg-purple-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
          >
            {n} jours
          </button>
        ))}
      </div>
      {error && <p className="text-red-800" role="alert">{error}</p>}
      {!data && !error && <div className="h-64 rounded-xl loading-shimmer" aria-busy="true" />}
      {data && (
        <>
          <dl className="grid grid-cols-3 gap-3 mb-6">
            {[
              ['Vues', number(data.period.views)],
              ['Clics', number(data.period.clicks)],
              ['Taux de clic', ctr(data.period.views, data.period.clicks)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                <dt className="text-sm text-gray-600">{label}</dt>
                <dd className="mt-1 text-2xl font-extrabold text-gray-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="grid md:grid-cols-2 gap-8">
            <DailyBars title="Vues par jour" days={data.days} field="views" total={data.period.views} />
            <DailyBars title="Clics par jour" days={data.days} field="clicks" total={data.period.clicks} />
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Depuis le début : {number(data.total.views)} vues, {number(data.total.clicks)} clics ({ctr(data.total.views, data.total.clicks)}).
            Une vue est comptée quand la bannière est visible au moins à moitié ; les robots ne sont pas comptés.
          </p>
          <button type="button" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="adm-link mt-3 text-sm">
            {showTable ? 'Masquer le tableau' : 'Voir le tableau jour par jour'}
          </button>
          {showTable && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="adm-th">Jour</th>
                    <th className="adm-th text-right">Vues</th>
                    <th className="adm-th text-right">Clics</th>
                    <th className="adm-th text-right">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...data.days].reverse().map((d) => (
                    <tr key={d.day}>
                      <td className="adm-td">{new Date(`${d.day}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td className="adm-td text-right tabular-nums">{number(d.views)}</td>
                      <td className="adm-td text-right tabular-nums">{number(d.clicks)}</td>
                      <td className="adm-td text-right tabular-nums">{ctr(d.views, d.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

const PromotionManagement = () => {
  const [ads, setAds] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // null | 'new' | campagne
  const [statsFor, setStatsFor] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const response = await fetch(ADMIN_API);
      if (!response.ok) throw new Error(await errorText(response, 'Campagnes indisponibles.'));
      setAds(await response.json());
    } catch (error) {
      setLoadError(error.message);
      setAds([]);
    }
  }, []);

  useEffect(() => {
    load();
    fetch(`${ADMIN_API}/placements`).then((r) => (r.ok ? r.json() : [])).then(setPlacements).catch(() => {});
    fetch(`${API_BASE_URL}/categories`).then((r) => (r.ok ? r.json() : [])).then(setCategories).catch(() => {});
    fetch(`${API_BASE_URL}/sellers`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setSellers(list.filter((s) => s.status === 'approved').sort((a, b) => a.businessName.localeCompare(b.businessName, 'fr'))))
      .catch(() => {});
  }, [load]);

  const placementLabel = useMemo(() => Object.fromEntries(placements.map((p) => [p.id, p.label])), [placements]);
  const categoryLabel = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const visible = (ads || []).filter((ad) => filter === 'all' || ad.placement === filter);
  const runningCount = (ads || []).filter((ad) => ad.phase === 'running').length;

  const saved = (ad) => {
    setAds((list) => {
      const others = (list || []).filter((a) => a.id !== ad.id);
      return [ad, ...others].sort((a, b) => new Date(parseUtc(b.createdAt)) - new Date(parseUtc(a.createdAt)));
    });
    setEditing(null);
  };

  const toggleStatus = async (ad) => {
    const status = ad.status === 'paused' ? 'active' : 'paused';
    const response = await fetch(`${ADMIN_API}/${ad.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      notify(await errorText(response, 'Le statut n\'a pas changé.'), 'error');
      return;
    }
    const updated = await response.json();
    setAds((list) => list.map((a) => (a.id === ad.id ? updated : a)));
    notify(status === 'paused' ? 'Campagne mise en pause.' : 'Campagne réactivée.');
  };

  const remove = async (ad) => {
    if (!(await confirmAction({ title: `Supprimer « ${ad.title} » ?`, message: 'La bannière disparaît du site et ses statistiques sont effacées. Pour la retirer en gardant ses chiffres, mettez-la plutôt en pause.' }))) return;
    const response = await fetch(`${ADMIN_API}/${ad.id}`, { method: 'DELETE' });
    if (!response.ok) {
      notify(await errorText(response, 'La suppression a échoué.'), 'error');
      return;
    }
    setAds((list) => list.filter((a) => a.id !== ad.id));
    notify('Campagne supprimée.');
  };

  const COLUMNS = 7;

  return (
    <div>
      <SectionHeader
        title="Publicités"
        count={ads ? ads.length : undefined}
        description={`Bannières de l'accueil, du catalogue et de l'app. ${runningCount} en ligne en ce moment.`}
        actions={
          <button type="button" onClick={() => setEditing('new')} disabled={!placements.length} className="adm-btn adm-btn-primary">
            Nouvelle campagne
          </button>
        }
      />

      <Toolbar>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Emplacement">
          {[{ id: 'all', label: 'Tous les emplacements' }, ...placements].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFilter(p.id)}
              aria-pressed={filter === p.id}
              className={`!min-h-0 h-9 px-4 rounded-full text-sm font-semibold ${filter === p.id ? 'bg-purple-900 text-white' : 'bg-white border border-gray-300 text-gray-800 hover:border-purple-400'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Toolbar>

      {loadError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-red-800" role="alert">{loadError}</p>}

      <div className="adm-card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="adm-th">Campagne</th>
              <th className="adm-th">Emplacement</th>
              <th className="adm-th">Période</th>
              <th className="adm-th">Statut</th>
              <th className="adm-th text-right">Vues</th>
              <th className="adm-th text-right">Clics</th>
              <th className="adm-th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ads === null ? (
              <LoadingRows colSpan={COLUMNS} rows={3} />
            ) : visible.length === 0 ? (
              <EmptyRow colSpan={COLUMNS}>
                {ads.length === 0
                  ? 'Aucune campagne. Créez-en une pour afficher une bannière sur le site ou dans l\'app.'
                  : 'Aucune campagne pour cet emplacement.'}
              </EmptyRow>
            ) : (
              visible.map((ad) => (
                <tr key={ad.id} className="align-top">
                  <td className="adm-td">
                    <div className="flex items-start gap-3 min-w-[16rem]">
                      <img
                        src={ad.imageDesktop || ad.imageMobile}
                        alt=""
                        className="w-24 h-12 shrink-0 rounded-lg object-cover bg-gray-100"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{ad.title}</p>
                        <p className="text-sm text-gray-600">{ad.advertiser || 'Nengoo'}</p>
                        <a href={ad.link} target="_blank" rel="noopener noreferrer" className="adm-link text-xs break-all">
                          {ad.link}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="adm-td text-sm">
                    {placementLabel[ad.placement] || ad.placement}
                    {ad.categories?.length > 0 && (
                      <p className="mt-1 text-xs text-gray-600">
                        {ad.categories.map((id) => categoryLabel[id] || id).join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="adm-td text-sm whitespace-nowrap">{period(ad)}</td>
                  <td className="adm-td"><PhaseBadge phase={ad.phase} /></td>
                  <td className="adm-td text-right tabular-nums">{number(ad.views)}</td>
                  <td className="adm-td text-right tabular-nums">
                    {number(ad.clicks)}
                    <span className="block text-xs text-gray-500">{ctr(ad.views, ad.clicks)}</span>
                  </td>
                  <td className="adm-td">
                    <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm min-w-[9rem]">
                      <button type="button" onClick={() => setStatsFor(ad)} className="adm-link">Statistiques</button>
                      <button type="button" onClick={() => setEditing(ad)} className="adm-link">Modifier</button>
                      {ad.phase !== 'ended' && (
                        <button type="button" onClick={() => toggleStatus(ad)} className="adm-link">
                          {ad.status === 'paused' ? 'Réactiver' : 'Mettre en pause'}
                        </button>
                      )}
                      <button type="button" onClick={() => remove(ad)} className="adm-link-danger">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <PromotionForm
          initial={editing === 'new' ? null : editing}
          placements={placements}
          categories={categories}
          sellers={sellers}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {statsFor && <StatsModal ad={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
};

export default PromotionManagement;
