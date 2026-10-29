
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notify, confirmAction, statusLabel } from './adminFeedback';
import { SectionHeader, Toolbar, SearchInput, SelectionBar, StatusSelect, EmptyRow, LoadingRows, Modal, Field, formatXAF } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerManagement = (props) => {
    const { user } = props;
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSellers, setSelectedSellers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');

    // State for create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSeller, setNewSeller] = useState({
        businessName: '',
        name: '',
        whatsapp: '',
        email: '',
        password: '',
        address: '',
        city: '',
        region: '',
        deliveryPrice: 0,
        description: '',
        categories: []
    });

    const handleCreateInputChange = (e) => {
        const { name, value } = e.target;
        setNewSeller({ ...newSeller, [name]: value });
    };

    const handleCreateSeller = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/sellers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role,
                },
                body: JSON.stringify(newSeller),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to create seller');
            }
            await fetchSellers();
            setShowCreateModal(false);
            setNewSeller({
                businessName: '',
                name: '',
                whatsapp: '',
                email: '',
                password: '',
                address: '',
                city: '',
                region: '',
                deliveryPrice: 0,
                description: '',
                categories: []
            });
            notify('Vendeur créé avec succès.', 'success');
        } catch (error) {
            console.error('Error creating seller:', error);
            notify(error.message, 'error');
        }
    };

    // State for the edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentSeller, setCurrentSeller] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedSellers(filteredSellers.map(s => s.id));
        } else {
            setSelectedSellers([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedSellers([...selectedSellers, id]);
        } else {
            setSelectedSellers(selectedSellers.filter(sellerId => sellerId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (await confirmAction({ title: `Supprimer ${selectedSellers.length} vendeur(s) ?`, message: 'Leurs boutiques disparaîtront du site. Cette action est définitive.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/sellers`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': user.role,
                    },
                    body: JSON.stringify({ ids: selectedSellers }),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete sellers');
                }
                await fetchSellers();
                setSelectedSellers([]);
                notify('Vendeurs supprimés avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting sellers:', error);
                notify(error.message, 'error');
            }
        }
    };

    const fetchSellers = async () => {
        if (!user || !user.role) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sellers`, {
                headers: { 'X-Admin-Role': user.role }
            });
            if (!response.ok) throw new Error('Failed to fetch sellers');
            const data = await response.json();
            setSellers(data);
        } catch (error) {
            console.error("Error fetching sellers:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        fetchSellers();
        fetchCategories();
    }, [user]);

    const handleStatusChange = async (seller, newStatus) => {
        if (!newStatus) return;
        try {
            const response = await fetch(`${API_BASE_URL}/sellers/${seller.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update seller status');
            }
            
            setSellers(sellers.map(s => s.id === seller.id ? { ...s, status: newStatus } : s));
            notify(`Statut du vendeur : ${statusLabel(newStatus)}.`, 'success');

        } catch (error) {
            console.error("Error updating seller status:", error);
            notify(error.message, 'error');
            fetchSellers();
        }
    };

    const handleEditClick = (seller) => {
        setCurrentSeller(seller);
        setNewPassword('');
        setShowEditModal(true);
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentSeller({ ...currentSeller, [name]: value });
    };

    const handleUpdateSeller = async (e) => {
        e.preventDefault();
        if (!currentSeller) return;

        const updatedData = { ...currentSeller };
        if (newPassword) {
            updatedData.password = newPassword;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/sellers/${currentSeller.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Role': user.role },
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update seller');
            }
            await fetchSellers();
            setShowEditModal(false);
            notify('Vendeur mis à jour avec succès.', 'success');
        } catch (error) {
            console.error('Error updating seller:', error);
            notify(error.message, 'error');
        }
    };

    const handleDeleteSeller = async (sellerId) => {
        if (await confirmAction({ title: 'Supprimer ce vendeur ?', message: 'Sa boutique disparaîtra du site. Cette action est définitive.' })) {
            try {
                const response = await fetch(`${API_BASE_URL}/sellers/${sellerId}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-Role': user.role },
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete seller');
                }
                await fetchSellers();
                notify('Vendeur supprimé avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting seller:', error);
                notify(error.message, 'error');
            }
        }
    };

    if (!user || !['super_admin', 'admin'].includes(user.role)) {
        return (
            <p className="adm-card p-5 text-gray-700">
                La gestion des vendeurs est réservée aux administrateurs et au super administrateur.
            </p>
        );
    }

    const pendingCount = sellers.filter(s => s.status === 'pending').length;

    const filteredSellers = sellers.filter(seller => {
        const query = searchQuery.toLowerCase();
        const matchesStatus = statusFilter === 'all' || seller.status === statusFilter;
        return matchesStatus && (
            (seller.businessName || '').toLowerCase().includes(query) ||
            (seller.name || '').toLowerCase().includes(query) ||
            (seller.email || '').toLowerCase().includes(query) ||
            (seller.whatsapp || '').toLowerCase().includes(query) ||
            (seller.city || '').toLowerCase().includes(query) ||
            (seller.region || '').toLowerCase().includes(query)
        );
    });

    const sellerFields = (data, onChange, isEdit) => (
        <>
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom de la boutique" required>
                    <input type="text" name="businessName" value={data.businessName} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Nom du propriétaire" required>
                    <input type="text" name="name" value={data.name} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="WhatsApp" required hint="Avec l'indicatif, ex. : 2376XXXXXXXX">
                    <input type="tel" name="whatsapp" value={data.whatsapp} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Email" required>
                    <input type="email" name="email" value={data.email} onChange={onChange} className="adm-input" required />
                </Field>
            </div>
            {isEdit ? (
                <Field label="Nouveau mot de passe" hint="Laissez vide pour garder le mot de passe actuel.">
                    <input type="password" name="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="adm-input" autoComplete="new-password" />
                </Field>
            ) : (
                <Field label="Mot de passe" required>
                    <input type="password" name="password" value={data.password} onChange={onChange} className="adm-input" autoComplete="new-password" required />
                </Field>
            )}
            <Field label="Adresse" required>
                <input type="text" name="address" value={data.address} onChange={onChange} className="adm-input" required />
            </Field>
            <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Ville" required>
                    <input type="text" name="city" value={data.city} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Région" required>
                    <input type="text" name="region" value={data.region} onChange={onChange} className="adm-input" required />
                </Field>
                <Field label="Livraison (FCFA)" required>
                    <input type="number" name="deliveryPrice" value={data.deliveryPrice} onChange={onChange} min="0" className="adm-input" required />
                </Field>
            </div>
            <Field label="Description de la boutique" required>
                <textarea name="description" value={data.description} onChange={onChange} className="adm-input" rows="3" required />
            </Field>
        </>
    );

    const COLUMNS = 6;

    return (
        <div>
            <SectionHeader
                title="Vendeurs"
                count={filteredSellers.length}
                actions={
                    <button onClick={() => setShowCreateModal(true)} className="adm-btn adm-btn-primary">
                        Ajouter un vendeur
                    </button>
                }
            />

            <Toolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher par boutique, nom, contact ou ville" />
                <div className="flex gap-1 p-1 rounded-full bg-gray-100 max-w-full overflow-x-auto hide-scrollbar" role="group" aria-label="Filtrer par statut">
                    {[
                        { value: 'all', label: 'Tous' },
                        { value: 'pending', label: `À valider${pendingCount ? ` (${pendingCount})` : ''}` },
                        { value: 'approved', label: 'Approuvés' },
                        { value: 'suspended', label: 'Suspendus' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatusFilter(opt.value)}
                            aria-pressed={statusFilter === opt.value}
                            className={`!min-h-0 h-8 px-3 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                                statusFilter === opt.value ? 'bg-white text-purple-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </Toolbar>

            <SelectionBar count={selectedSellers.length} onDelete={handleBulkDelete} onClear={() => setSelectedSellers([])} />

            {showCreateModal && (
                <Modal title="Ajouter un vendeur" onClose={() => setShowCreateModal(false)}>
                    <form onSubmit={handleCreateSeller} className="space-y-4">
                        {sellerFields(newSeller, handleCreateInputChange, false)}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowCreateModal(false)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary">Créer le vendeur</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showEditModal && currentSeller && (
                <Modal title={`Modifier ${currentSeller.businessName}`} onClose={() => setShowEditModal(false)}>
                    <form onSubmit={handleUpdateSeller} className="space-y-4">
                        {sellerFields(currentSeller, handleEditInputChange, true)}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowEditModal(false)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary">Enregistrer</button>
                        </div>
                    </form>
                </Modal>
            )}

            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th w-10">
                                <input
                                    type="checkbox"
                                    aria-label="Tout sélectionner"
                                    onChange={handleSelectAll}
                                    checked={selectedSellers.length === filteredSellers.length && filteredSellers.length > 0}
                                />
                            </th>
                            <th className="adm-th">Boutique</th>
                            <th className="adm-th">Contact</th>
                            <th className="adm-th text-right">Livraison</th>
                            <th className="adm-th">Statut</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={COLUMNS} />
                        ) : filteredSellers.length === 0 ? (
                            <EmptyRow colSpan={COLUMNS}>
                                {sellers.length === 0 ? 'Aucun vendeur inscrit pour le moment.' : 'Aucun vendeur ne correspond à ces critères.'}
                            </EmptyRow>
                        ) : filteredSellers.map((seller) => (
                            <tr key={seller.id} className={selectedSellers.includes(seller.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                                <td className="adm-td">
                                    <input
                                        type="checkbox"
                                        aria-label={`Sélectionner ${seller.businessName}`}
                                        checked={selectedSellers.includes(seller.id)}
                                        onChange={(e) => handleSelectOne(e, seller.id)}
                                    />
                                </td>
                                <td className="adm-td">
                                    <p className="font-semibold">{seller.businessName}</p>
                                    <p className="text-xs text-gray-500">{[seller.name, seller.city].filter(Boolean).join(', ')}</p>
                                </td>
                                <td className="adm-td">
                                    <p className="whitespace-nowrap">{seller.whatsapp}</p>
                                    <p className="text-xs text-gray-500 break-all">{seller.email}</p>
                                </td>
                                <td className="adm-td text-right price whitespace-nowrap">{formatXAF(seller.deliveryPrice)}</td>
                                <td className="adm-td">
                                    <StatusSelect
                                        value={seller.status}
                                        onChange={(value) => handleStatusChange(seller, value)}
                                        options={['pending', 'approved', 'suspended']}
                                        label={`Statut de ${seller.businessName}`}
                                    />
                                </td>
                                <td className="adm-td whitespace-nowrap text-right">
                                    <Link to={`/admin/seller-products/${seller.id}`} className="adm-link">Produits</Link>
                                    <button onClick={() => handleEditClick(seller)} className="adm-link !min-h-0 ml-4">Modifier</button>
                                    <button onClick={() => handleDeleteSeller(seller.id)} className="adm-link-danger !min-h-0 ml-4">Supprimer</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SellerManagement;
