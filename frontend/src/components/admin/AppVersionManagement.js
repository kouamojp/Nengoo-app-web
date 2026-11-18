import React, { useState, useEffect } from 'react';
import { notify } from './adminFeedback';
import { SectionHeader, Field } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const PLATFORMS = [
    { id: 'android', name: 'Android', store: 'Play Store', example: 'https://play.google.com/store/apps/details?id=nengoo.com' },
    { id: 'ios', name: 'iPhone', store: 'App Store', example: 'https://apps.apple.com/app/nengoo/id…' },
];

const empty = { minBuild: '', latestBuild: '', storeUrl: '' };
const toForm = (p) => ({
    minBuild: p.minBuild ? String(p.minBuild) : '',
    latestBuild: p.latestBuild ? String(p.latestBuild) : '',
    storeUrl: p.storeUrl || '',
});
const toNumber = (v) => (v === '' ? 0 : Number(v));

/** Ce que verront les utilisateurs avec ces réglages, en une ou deux phrases. */
const effect = ({ minBuild, latestBuild }) => {
    const min = toNumber(minBuild);
    const latest = toNumber(latestBuild);
    if (!min && !latest) return ['Aucune demande de mise à jour.'];
    const lines = [];
    if (latest > min) {
        lines.push(min
            ? `Versions ${min} à ${latest - 1} : invitation à mettre à jour, avec « Plus tard ».`
            : `Versions avant ${latest} : invitation à mettre à jour, avec « Plus tard ».`);
    }
    if (min) lines.push(`Versions avant ${min} : bloquées jusqu'à la mise à jour.`);
    return lines;
};

const errorFor = ({ minBuild, latestBuild, storeUrl }) => {
    if (toNumber(minBuild) > toNumber(latestBuild)) return 'La version minimale ne peut pas dépasser la version recommandée.';
    if ((toNumber(minBuild) || toNumber(latestBuild)) && !storeUrl.trim().startsWith('https://')) {
        return 'Indiquez le lien https:// de l\'app dans le store.';
    }
    return null;
};

// Mise à jour de l'app mobile : version recommandée (invitation) et version
// minimale (blocage), par plateforme. Lu par l'app à chaque ouverture.
const AppVersionManagement = ({ user }) => {
    const [form, setForm] = useState({ android: empty, ios: empty });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/app/version`, { cache: 'no-store' });
                if (!res.ok) throw new Error('Chargement impossible. Réessayez.');
                const data = await res.json();
                setForm({ android: toForm(data.android), ios: toForm(data.ios) });
            } catch (err) {
                notify(err.message, 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const update = (platform, changes) => setForm(f => ({ ...f, [platform]: { ...f[platform], ...changes } }));
    const errors = { android: errorFor(form.android), ios: errorFor(form.ios) };

    const handleSave = async (e) => {
        e.preventDefault();
        if (errors.android || errors.ios) {
            notify('Corrigez les réglages signalés avant d\'enregistrer.', 'error');
            return;
        }
        setSaving(true);
        try {
            const body = Object.fromEntries(PLATFORMS.map(({ id }) => [id, {
                minBuild: toNumber(form[id].minBuild),
                latestBuild: toNumber(form[id].latestBuild),
                storeUrl: form[id].storeUrl.trim(),
            }]));
            const res = await fetch(`${API_BASE_URL}/app/version`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const detail = Array.isArray(err.detail) ? err.detail[0]?.msg : err.detail;
                throw new Error((detail || 'L\'enregistrement a échoué.').replace(/^Value error, /, ''));
            }
            const data = await res.json();
            setForm({ android: toForm(data.android), ios: toForm(data.ios) });
            notify('Versions de l\'app enregistrées.', 'success');
        } catch (err) {
            notify(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (user.role !== 'super_admin') {
        return (
            <p className="adm-card p-5 text-gray-700">
                Seul le super administrateur peut modifier les versions de l'app.
            </p>
        );
    }

    return (
        <div>
            <SectionHeader
                title="Mise à jour de l'app"
                description="Numéro de version : le nombre après « + » dans pubspec.yaml de l'app (1.0.3+21 → 21). L'app le compare à ces réglages à chaque ouverture."
            />
            <form className="space-y-6 max-w-3xl" onSubmit={handleSave} noValidate>
                <p className="adm-card p-4 border-l-4 !border-l-amber-500 text-sm text-gray-800">
                    Ne montez la version minimale qu'une fois la nouvelle version en ligne dans le store.
                    Sinon, les utilisateurs sont bloqués sans pouvoir mettre à jour. Sur l'App Store, la validation prend souvent un à trois jours.
                </p>

                {PLATFORMS.map(({ id, name, store, example }) => {
                    const values = form[id];
                    const error = errors[id];
                    return (
                        <fieldset key={id} className="adm-card p-5 sm:p-6" aria-describedby={`${id}-effect`}>
                            <legend className="sr-only">{name}</legend>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4" aria-hidden="true">{name}</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Version recommandée" hint="Plus ancienne : invitation à mettre à jour, que l'on peut repousser.">
                                    <input
                                        type="number" min="0" step="1" inputMode="numeric"
                                        value={values.latestBuild}
                                        onChange={(e) => update(id, { latestBuild: e.target.value })}
                                        className="adm-input" disabled={loading} placeholder="0"
                                    />
                                </Field>
                                <Field label="Version minimale" hint="Plus ancienne : app bloquée jusqu'à la mise à jour. Vide : personne n'est bloqué.">
                                    <input
                                        type="number" min="0" step="1" inputMode="numeric"
                                        value={values.minBuild}
                                        onChange={(e) => update(id, { minBuild: e.target.value })}
                                        className="adm-input" disabled={loading} placeholder="0"
                                        aria-invalid={Boolean(error) && toNumber(values.minBuild) > toNumber(values.latestBuild)}
                                    />
                                </Field>
                                <Field label={`Lien de l'app dans le ${store}`} className="sm:col-span-2">
                                    <input
                                        type="url" inputMode="url"
                                        value={values.storeUrl}
                                        onChange={(e) => update(id, { storeUrl: e.target.value })}
                                        className="adm-input" disabled={loading} placeholder={example}
                                    />
                                </Field>
                            </div>
                            <div id={`${id}-effect`} className="mt-4 rounded-lg bg-purple-50 px-4 py-3 text-sm text-purple-950" aria-live="polite">
                                {effect(values).map(line => <p key={line}>{line}</p>)}
                            </div>
                            {error && <p className="mt-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
                        </fieldset>
                    );
                })}

                <button type="submit" disabled={saving || loading} className="adm-btn adm-btn-primary">
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </form>
        </div>
    );
};

export default AppVersionManagement;
