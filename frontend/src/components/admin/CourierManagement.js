import React, { useState, useEffect } from 'react';
import { notify, confirmAction } from './adminFeedback';
import { SectionHeader, EmptyRow, LoadingRows, Modal, Field } from './AdminUI';
import CityDatalist from '../ui/CityDatalist';
import { CITIES_DATALIST_ID } from '../../lib/cities';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const emptyCourier = { name: '', phone: '', city: '', active: true };

// Lien personnel du livreur : sa page de livraisons, sans mot de passe
export const courierLink = (courier) => `${window.location.origin}/livreur/${courier.token}`;

const CourierManagement = () => {
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // { ...courier } ou nouveau

    const load = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/couriers`);
            if (!response.ok) throw new Error('Chargement impossible. Réessayez.');
            setCouriers(await response.json());
        } catch (err) {
            notify(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const save = async (e, { newLink = false } = {}) => {
        e?.preventDefault();
        const isNew = !editing.id;
        try {
            const response = await fetch(
                isNew ? `${API_BASE_URL}/couriers` : `${API_BASE_URL}/couriers/${editing.id}${newLink ? '?newLink=true' : ''}`,
                {
                    method: isNew ? 'POST' : 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editing.name, phone: editing.phone, city: editing.city || null, active: editing.active }),
                },
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.detail || 'L\'enregistrement a échoué.');
            setEditing(null);
            await load();
            notify(newLink ? 'Nouveau lien créé : l\'ancien ne marche plus.' : 'Livreur enregistré.', 'success');
        } catch (err) {
            notify(err.message, 'error');
        }
    };

    const remove = async (courier) => {
        if (!await confirmAction({ title: `Supprimer ${courier.name} ?`, message: 'Son lien cessera de marcher.' })) return;
        const response = await fetch(`${API_BASE_URL}/couriers/${courier.id}`, { method: 'DELETE' });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            notify(err.detail || 'La suppression a échoué.', 'error');
            return;
        }
        await load();
        notify('Livreur supprimé.', 'success');
    };

    const copyLink = async (courier) => {
        try {
            await navigator.clipboard.writeText(courierLink(courier));
            notify(`Lien de ${courier.name} copié : envoyez-le-lui sur WhatsApp.`, 'success');
        } catch {
            notify(courierLink(courier), 'success');
        }
    };

    return (
        <div>
            <SectionHeader
                title="Livreurs"
                count={couriers.length}
                description="Chaque livreur reçoit un lien personnel vers ses livraisons. Il marque une commande livrée avec le code à 4 chiffres que le client a reçu."
                actions={<button type="button" onClick={() => setEditing({ ...emptyCourier })} className="adm-btn adm-btn-primary">Ajouter un livreur</button>}
            />

            {editing && (
                <Modal title={editing.id ? 'Modifier le livreur' : 'Ajouter un livreur'} onClose={() => setEditing(null)} size="max-w-lg">
                    <form onSubmit={save} className="space-y-4">
                        <Field label="Nom" required>
                            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="adm-input" required />
                        </Field>
                        <Field label="Téléphone (WhatsApp)" required>
                            <input type="tel" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="+237 6XX XX XX XX" className="adm-input" required />
                        </Field>
                        <Field label="Ville">
                            <input list={CITIES_DATALIST_ID} value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className="adm-input" />
                            <CityDatalist />
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                            Actif (peut recevoir des livraisons et ouvrir son lien)
                        </label>
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            {editing.id && (
                                <button type="button" onClick={() => save(null, { newLink: true })} className="adm-btn adm-btn-secondary mr-auto">
                                    Changer son lien
                                </button>
                            )}
                            <button type="button" onClick={() => setEditing(null)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary">Enregistrer</button>
                        </div>
                    </form>
                </Modal>
            )}

            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th">Livreur</th>
                            <th className="adm-th">Ville</th>
                            <th className="adm-th">Statut</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? <LoadingRows colSpan={4} /> : couriers.length === 0 ? (
                            <EmptyRow colSpan={4}>Aucun livreur. Ajoutez-en un pour lui attribuer des commandes.</EmptyRow>
                        ) : couriers.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="adm-td">
                                    <p className="font-semibold">{c.name}</p>
                                    <p className="text-xs text-gray-500">{c.phone}</p>
                                </td>
                                <td className="adm-td">{c.city}</td>
                                <td className="adm-td">{c.active ? 'Actif' : 'Désactivé'}</td>
                                <td className="adm-td text-right">
                                    <div className="inline-flex gap-4">
                                        <button type="button" onClick={() => copyLink(c)} className="adm-link !min-h-0">Copier son lien</button>
                                        <button type="button" onClick={() => setEditing({ ...c })} className="adm-link !min-h-0">Modifier</button>
                                        <button type="button" onClick={() => remove(c)} className="adm-link-danger !min-h-0">Supprimer</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CourierManagement;
