import React, { useState, useEffect } from 'react';
import { notify, confirmAction, statusLabel } from './adminFeedback';
import { SectionHeader, Toolbar, SearchInput, SelectionBar, StatusSelect, EmptyRow, LoadingRows, Modal, Field } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const BuyerManagement = (props) => {
    const { user } = props;
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBuyers, setSelectedBuyers] = useState([]);
    const [editingBuyerId, setEditingBuyerId] = useState(null);
    const [editingData, setEditingData] = useState({ name: '', email: '' });
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [selectedBuyerForPassword, setSelectedBuyerForPassword] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const openPasswordModal = (buyer) => {
        setSelectedBuyerForPassword(buyer);
        setPasswordModalOpen(true);
    };

    const handlePasswordChange = async () => {
        if (!newPassword) {
            notify("Le nouveau mot de passe ne peut pas être vide.", 'error');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/buyers/${selectedBuyerForPassword.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role,
                },
                body: JSON.stringify({ password: newPassword }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update password');
            }
            setPasswordModalOpen(false);
            setNewPassword('');
            notify(`Mot de passe pour ${selectedBuyerForPassword.name} mis à jour.`, 'success');
        } catch (error) {
            console.error('Error updating password:', error);
            notify(error.message, 'error');
        }
    };

    const handleEditClick = (buyer) => {
        setEditingBuyerId(buyer.id);
        setEditingData({ name: buyer.name, email: buyer.email });
    };

    const handleCancelClick = () => {
        setEditingBuyerId(null);
        setEditingData({ name: '', email: '' });
    };

    const handleSaveClick = async (buyerId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/buyers/${buyerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role,
                },
                body: JSON.stringify(editingData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update buyer');
            }
            await fetchBuyers(); // Refetch to get the updated list
            setEditingBuyerId(null);
            notify('Informations de l\'acheteur mises à jour.', 'success');
        } catch (error) {
            console.error('Error updating buyer:', error);
            notify(error.message, 'error');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedBuyers(filteredBuyers.map(b => b.id));
        } else {
            setSelectedBuyers([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedBuyers([...selectedBuyers, id]);
        } else {
            setSelectedBuyers(selectedBuyers.filter(buyerId => buyerId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (await confirmAction({ title: `Supprimer ${selectedBuyers.length} acheteur(s) ?`, message: 'Leurs comptes seront supprimés. Cette action est définitive.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/buyers`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': user.role,
                    },
                    body: JSON.stringify({ ids: selectedBuyers }),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete buyers');
                }
                await fetchBuyers();
                setSelectedBuyers([]);
                notify('Acheteurs supprimés avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting buyers:', error);
                notify(error.message, 'error');
            }
        }
    };

    const fetchBuyers = async () => {
        if (!user || !user.role) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/buyers`, {
                headers: { 'X-Admin-Role': user.role }
            });
            if (!response.ok) throw new Error('Failed to fetch buyers');
            const data = await response.json();
            setBuyers(data);
        } catch (error) {
            console.error("Error fetching buyers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, [user]);

    const handleStatusChange = async (buyer, newStatus) => {
        if (!newStatus) return;
        try {
            const response = await fetch(`${API_BASE_URL}/buyers/${buyer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update buyer status');
            }
            
            setBuyers(buyers.map(b => b.id === buyer.id ? { ...b, status: newStatus } : b));
            notify(`Statut de l'acheteur : ${statusLabel(newStatus)}.`, 'success');

        } catch (error) {
            console.error("Error updating buyer status:", error);
            notify(error.message, 'error');
            fetchBuyers();
        }
    };
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'XAF',
          minimumFractionDigits: 0,
        }).format(price);
    };

    const filteredBuyers = buyers.filter(buyer => {
        const query = searchQuery.toLowerCase();
        return (
            (buyer.name || '').toLowerCase().includes(query) ||
            (buyer.email || '').toLowerCase().includes(query) ||
            (buyer.whatsapp || '').toLowerCase().includes(query)
        );
    });

    if (!user || !['super_admin', 'admin'].includes(user.role)) {
        return (
            <p className="adm-card p-5 text-gray-700">
                La gestion des acheteurs est réservée aux administrateurs et au super administrateur.
            </p>
        );
    }

    const COLUMNS = 7;

    return (
        <div>
            <SectionHeader
                title="Acheteurs"
                count={filteredBuyers.length}
                actions={<button onClick={fetchBuyers} className="adm-btn adm-btn-secondary">Actualiser</button>}
            />

            <Toolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher par nom, email ou WhatsApp" />
            </Toolbar>

            <SelectionBar count={selectedBuyers.length} onDelete={handleBulkDelete} onClear={() => setSelectedBuyers([])} />

            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th w-10">
                                <input
                                    type="checkbox"
                                    aria-label="Tout sélectionner"
                                    onChange={handleSelectAll}
                                    checked={selectedBuyers.length === filteredBuyers.length && filteredBuyers.length > 0}
                                />
                            </th>
                            <th className="adm-th">Acheteur</th>
                            <th className="adm-th">Contact</th>
                            <th className="adm-th text-right">Commandes</th>
                            <th className="adm-th text-right">Total dépensé</th>
                            <th className="adm-th">Statut</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={COLUMNS} />
                        ) : filteredBuyers.length === 0 ? (
                            <EmptyRow colSpan={COLUMNS}>
                                {buyers.length === 0 ? 'Aucun acheteur inscrit pour le moment.' : 'Aucun acheteur ne correspond à cette recherche.'}
                            </EmptyRow>
                        ) : filteredBuyers.map((buyer) => {
                            const editing = editingBuyerId === buyer.id;
                            return (
                                <tr key={buyer.id} className={selectedBuyers.includes(buyer.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                                    <td className="adm-td">
                                        <input
                                            type="checkbox"
                                            aria-label={`Sélectionner ${buyer.name}`}
                                            checked={selectedBuyers.includes(buyer.id)}
                                            onChange={(e) => handleSelectOne(e, buyer.id)}
                                        />
                                    </td>
                                    <td className="adm-td font-semibold">
                                        {editing ? (
                                            <input
                                                type="text"
                                                value={editingData.name}
                                                onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                                                aria-label="Nom"
                                                className="adm-input !min-h-0 h-9 min-w-[10rem]"
                                            />
                                        ) : buyer.name}
                                    </td>
                                    <td className="adm-td">
                                        <p className="whitespace-nowrap">{buyer.whatsapp}</p>
                                        {editing ? (
                                            <input
                                                type="email"
                                                value={editingData.email}
                                                onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                                                aria-label="Email"
                                                className="adm-input !min-h-0 h-9 mt-1 min-w-[12rem]"
                                            />
                                        ) : (
                                            <p className="text-xs text-gray-500 break-all">{buyer.email}</p>
                                        )}
                                    </td>
                                    <td className="adm-td text-right tabular-nums">{buyer.totalOrders || 0}</td>
                                    <td className="adm-td text-right price whitespace-nowrap">{formatPrice(buyer.totalSpent || 0)}</td>
                                    <td className="adm-td">
                                        <StatusSelect
                                            value={buyer.status}
                                            onChange={(value) => handleStatusChange(buyer, value)}
                                            options={['active', 'pending', 'suspended']}
                                            label={`Statut de ${buyer.name}`}
                                        />
                                    </td>
                                    <td className="adm-td whitespace-nowrap text-right">
                                        {editing ? (
                                            <>
                                                <button onClick={() => handleSaveClick(buyer.id)} className="adm-link !min-h-0">Enregistrer</button>
                                                <button onClick={handleCancelClick} className="!min-h-0 ml-4 font-semibold text-gray-600 hover:text-gray-900">Annuler</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEditClick(buyer)} className="adm-link !min-h-0">Modifier</button>
                                                <button onClick={() => openPasswordModal(buyer)} className="adm-link !min-h-0 ml-4">Mot de passe</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {passwordModalOpen && (
                <Modal title={`Nouveau mot de passe pour ${selectedBuyerForPassword?.name || 'cet acheteur'}`} onClose={() => setPasswordModalOpen(false)} size="max-w-md">
                    <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} className="space-y-4">
                        <Field label="Nouveau mot de passe" hint="Communiquez-le à l'acheteur par un canal sûr.">
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                                className="adm-input"
                                autoFocus
                            />
                        </Field>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setPasswordModalOpen(false)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary">Enregistrer</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default BuyerManagement;


