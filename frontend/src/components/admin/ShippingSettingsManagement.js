import React, { useState, useEffect } from 'react';
import { notify } from './adminFeedback';
import { SectionHeader, Field } from './AdminUI';
import CityDatalist from '../ui/CityDatalist';
import { CITIES_DATALIST_ID } from '../../lib/cities';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const emptyZone = () => ({ city: '', fee: '', neighborhoods: [] });

// Frais de livraison : tarif standard, livraison offerte au-delà d'un montant,
// et tarifs par ville et par quartier. Un vendeur qui a fixé son propre tarif le garde.
const ShippingSettingsManagement = ({ user }) => {
    const [standardFee, setStandardFee] = useState('');
    const [freeAbove, setFreeAbove] = useState('');
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [standardRes, zonesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/settings/shipping`),
                    fetch(`${API_BASE_URL}/delivery/zones`),
                ]);
                if (!standardRes.ok || !zonesRes.ok) throw new Error('Chargement impossible. Réessayez.');
                setStandardFee((await standardRes.json()).price);
                const data = await zonesRes.json();
                setFreeAbove(data.freeAbove ?? '');
                setZones(data.zones || []);
            } catch (err) {
                notify(err.message, 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const updateZone = (index, changes) => setZones(list => list.map((z, i) => (i === index ? { ...z, ...changes } : z)));
    const updateArea = (zi, ai, changes) => updateZone(zi, {
        neighborhoods: zones[zi].neighborhoods.map((a, i) => (i === ai ? { ...a, ...changes } : a)),
    });

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const [standardRes, zonesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/settings/shipping`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ price: Number(standardFee) || 0 }),
                }),
                fetch(`${API_BASE_URL}/delivery/zones`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        freeAbove: freeAbove === '' ? null : Number(freeAbove),
                        zones: zones
                            .filter(z => z.city.trim())
                            .map(z => ({
                                city: z.city,
                                fee: Number(z.fee) || 0,
                                neighborhoods: z.neighborhoods
                                    .filter(a => a.name.trim())
                                    .map(a => ({ name: a.name, fee: Number(a.fee) || 0 })),
                            })),
                    }),
                }),
            ]);
            for (const res of [standardRes, zonesRes]) {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || 'L\'enregistrement a échoué.');
                }
            }
            setZones((await zonesRes.json()).zones);
            notify('Frais de livraison enregistrés.', 'success');
        } catch (err) {
            notify(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (user.role !== 'super_admin') {
        return (
            <p className="adm-card p-5 text-gray-700">
                Seul le super administrateur peut modifier les frais de livraison.
            </p>
        );
    }

    return (
        <div>
            <SectionHeader
                title="Frais de livraison"
                description="Ordre d'application pour une livraison à domicile : tarif fixé par le vendeur, sinon tarif du quartier, sinon de la ville, sinon le tarif standard. Le retrait en point relais est gratuit."
            />
            <CityDatalist />
            <form className="space-y-6 max-w-3xl" onSubmit={handleSave}>
                <div className="adm-card p-5 sm:p-6 grid sm:grid-cols-2 gap-4">
                    <Field label="Tarif standard (FCFA)" hint="Villes sans tarif ci-dessous.">
                        <input type="number" min="0" step="100" value={standardFee} onChange={(e) => setStandardFee(e.target.value)} className="adm-input" disabled={loading} />
                    </Field>
                    <Field label="Livraison offerte à partir de (FCFA)" hint="Montant d'achat chez un même vendeur. Vide : jamais offerte.">
                        <input type="number" min="0" step="1000" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} className="adm-input" disabled={loading} />
                    </Field>
                </div>

                <div className="space-y-4">
                    {zones.map((zone, zi) => (
                        <fieldset key={zi} className="adm-card p-5 sm:p-6">
                            <legend className="sr-only">Ville {zone.city}</legend>
                            <div className="grid grid-cols-[1fr_9rem_auto] gap-3 items-end">
                                <Field label="Ville">
                                    <input list={CITIES_DATALIST_ID} value={zone.city} onChange={(e) => updateZone(zi, { city: e.target.value })} className="adm-input" required />
                                </Field>
                                <Field label="Tarif (FCFA)">
                                    <input type="number" min="0" step="100" value={zone.fee} onChange={(e) => updateZone(zi, { fee: e.target.value })} className="adm-input" required />
                                </Field>
                                <button type="button" onClick={() => setZones(list => list.filter((_, i) => i !== zi))} className="adm-link-danger !min-h-0 pb-3">
                                    Retirer
                                </button>
                            </div>
                            <div className="mt-4 pl-4 border-l-2 border-purple-200 space-y-2">
                                <p className="text-sm font-semibold text-gray-700">Quartiers à tarif différent</p>
                                {zone.neighborhoods.map((area, ai) => (
                                    <div key={ai} className="grid grid-cols-[1fr_9rem_auto] gap-3 items-center">
                                        <input aria-label="Quartier" placeholder="Quartier" value={area.name} onChange={(e) => updateArea(zi, ai, { name: e.target.value })} className="adm-input" />
                                        <input aria-label={`Tarif ${area.name}`} type="number" min="0" step="100" value={area.fee} onChange={(e) => updateArea(zi, ai, { fee: e.target.value })} className="adm-input" />
                                        <button type="button" onClick={() => updateZone(zi, { neighborhoods: zone.neighborhoods.filter((_, i) => i !== ai) })} className="adm-link-danger !min-h-0">
                                            Retirer
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => updateZone(zi, { neighborhoods: [...zone.neighborhoods, { name: '', fee: '' }] })} className="adm-link !min-h-0">
                                    Ajouter un quartier
                                </button>
                            </div>
                        </fieldset>
                    ))}
                    <button type="button" onClick={() => setZones(list => [...list, emptyZone()])} className="adm-btn adm-btn-secondary">
                        Ajouter une ville
                    </button>
                </div>

                <button type="submit" disabled={saving || loading} className="adm-btn adm-btn-primary">
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </form>
        </div>
    );
};

export default ShippingSettingsManagement;
