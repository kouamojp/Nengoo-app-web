
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerManagement = (props) => {
    const { user } = props;
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSellers, setSelectedSellers] = useState([]);

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
            alert('✅ Vendeur créé avec succès!');
        } catch (error) {
            console.error('Error creating seller:', error);
            alert(`Erreur: ${error.message}`);
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
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedSellers.length} vendeurs? Cette action est irréversible.`)) {
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
                alert('🗑️ Vendeurs supprimés avec succès!');
            } catch (error) {
                console.error('Error deleting sellers:', error);
                alert(`Erreur: ${error.message}`);
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
            alert(`✅ Statut du vendeur mis à jour à "${newStatus}".`);

        } catch (error) {
            console.error("Error updating seller status:", error);
            alert(`Erreur: ${error.message}`);
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
            alert('✅ Vendeur mis à jour avec succès!');
        } catch (error) {
            console.error('Error updating seller:', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    const handleDeleteSeller = async (sellerId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce vendeur? Cette action est irréversible.')) {
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
                alert('🗑️ Vendeur supprimé avec succès!');
            } catch (error) {
                console.error('Error deleting seller:', error);
                alert(`Erreur: ${error.message}`);
            }
        }
    };

    if (!user || !['super_admin', 'admin'].includes(user.role)) {
        return (
            <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="font-bold">Permission Denied</p>
                <p>You do not have the required permissions to view this section.</p>
            </div>
        );
    }


    const filteredSellers = sellers.filter(seller => {
        const query = searchQuery.toLowerCase();
        return (
            seller.businessName.toLowerCase().includes(query) ||
            seller.name.toLowerCase().includes(query) ||
            seller.email.toLowerCase().includes(query) ||
            seller.whatsapp.toLowerCase().includes(query) ||
            seller.city.toLowerCase().includes(query) ||
            seller.region.toLowerCase().includes(query)
        );
    });

    return (
        <div>
            <h2 className="text-xl md:text-3xl font-bold mb-6">Gestion des vendeurs ({filteredSellers.length})</h2>

            <div className="mb-4 flex justify-between items-center max-sm:flex-wrap max-sm:gap-4">
                <input
                    type="text"
                    placeholder="Rechercher des vendeurs..."
                    className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                        + Ajouter un vendeur
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedSellers.length === 0}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                    >
                        Supprimer la sélection
                    </button>
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">➕ Ajouter un vendeur</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleCreateSeller} className="space-y-4">
                            <input type="text" name="businessName" value={newSeller.businessName} onChange={handleCreateInputChange} placeholder="Nom de la boutique" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="name" value={newSeller.name} onChange={handleCreateInputChange} placeholder="Nom du propriétaire" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="tel" name="whatsapp" value={newSeller.whatsapp} onChange={handleCreateInputChange} placeholder="WhatsApp (ex: 2376xxxxxxxx)" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="email" name="email" value={newSeller.email} onChange={handleCreateInputChange} placeholder="Email" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="password" name="password" value={newSeller.password} onChange={handleCreateInputChange} placeholder="Mot de passe" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="address" value={newSeller.address} onChange={handleCreateInputChange} placeholder="Adresse" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="city" value={newSeller.city} onChange={handleCreateInputChange} placeholder="Ville" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="region" value={newSeller.region} onChange={handleCreateInputChange} placeholder="Région" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="number" name="deliveryPrice" value={newSeller.deliveryPrice} onChange={handleCreateInputChange} placeholder="Prix de livraison" className="w-full px-4 py-3 border rounded-lg" required />
                            <textarea name="description" value={newSeller.description} onChange={handleCreateInputChange} placeholder="Description de la boutique" className="w-full px-4 py-3 border rounded-lg" required />
                            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold">Créer le vendeur</button>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && currentSeller && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">✏️ Modifier le vendeur</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleUpdateSeller} className="space-y-4">
                            <input type="text" name="businessName" value={currentSeller.businessName} onChange={handleEditInputChange} placeholder="Nom de la boutique" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="name" value={currentSeller.name} onChange={handleEditInputChange} placeholder="Nom du propriétaire" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="tel" name="whatsapp" value={currentSeller.whatsapp} onChange={handleEditInputChange} placeholder="WhatsApp" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="email" name="email" value={currentSeller.email} onChange={handleEditInputChange} placeholder="Email" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="password" name="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe (laisser vide pour ne pas changer)" className="w-full px-4 py-3 border rounded-lg" />
                            <input type="text" name="address" value={currentSeller.address} onChange={handleEditInputChange} placeholder="Adresse" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="city" value={currentSeller.city} onChange={handleEditInputChange} placeholder="Ville" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="region" value={currentSeller.region} onChange={handleEditInputChange} placeholder="Région" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="number" name="deliveryPrice" value={currentSeller.deliveryPrice} onChange={handleEditInputChange} placeholder="Prix de livraison" className="w-full px-4 py-3 border rounded-lg" required />
                            <textarea name="description" value={currentSeller.description} onChange={handleEditInputChange} placeholder="Description de la boutique" className="w-full px-4 py-3 border rounded-lg" required />
                            {/* Note: Category editing can be complex. For now, we are not including it in the edit form. */}
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold">Mettre à jour</button>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-lg shadow-md overflow-auto">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input 
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedSellers.length === filteredSellers.length && filteredSellers.length > 0}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boutique</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Livr.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSellers.map((seller) => (
                                <tr key={seller.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedSellers.includes(seller.id)}
                                            onChange={(e) => handleSelectOne(e, seller.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium">{seller.businessName}</td>
                                    <td className="px-6 py-4 text-sm">{seller.whatsapp} <br/> {seller.email}</td>
                                    <td className="px-6 py-4 text-sm">{seller.city}</td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(seller.deliveryPrice || 0)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={seller.status}
                                            onChange={(e) => handleStatusChange(seller, e.target.value)}
                                            className={`p-2 rounded text-sm border-transparent focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                                seller.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                seller.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            <option value="approved">Approuvé</option>
                                            <option value="suspended">Suspendu</option>
                                            <option value="pending">En attente</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <button onClick={() => handleEditClick(seller)} className="text-blue-600 hover:text-blue-800">Modifier</button>
                                        <button onClick={() => handleDeleteSeller(seller.id)} className="text-red-600 hover:text-red-800 ml-4">Supprimer</button>
                                        <Link to={`/admin/seller-products/${seller.id}`} target='_blank' className="text-green-600 hover:text-green-800 ml-4">Voir les produits</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SellerManagement;
