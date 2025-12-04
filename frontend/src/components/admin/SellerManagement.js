
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerManagement = (props) => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentSeller, setCurrentSeller] = useState(null);
    const [newSellerData, setNewSellerData] = useState({
        whatsapp: '', password: '', name: '', businessName: '', email: '',
        city: '', region: '', address: '', categories: '', description: '',
    });

    const fetchSellers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sellers`, {
                headers: { 'X-Admin-Role': 'super_admin' }
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

    useEffect(() => {
        fetchSellers();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewSellerData({ ...newSellerData, [name]: value });
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentSeller({ ...currentSeller, [name]: value });
    };

    const handleAddSeller = async (e) => {
        e.preventDefault();
        try {
            const sellerToCreate = {
                ...newSellerData,
                categories: newSellerData.categories.split(',').map(c => c.trim()),
            };

            const response = await fetch(`${API_BASE_URL}/sellers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Role': 'super_admin' },
                body: JSON.stringify(sellerToCreate),
            });
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const err = JSON.parse(errorText);
                    throw new Error(err.detail || 'Failed to create seller');
                } catch (e) {
                    throw new Error(errorText || 'Failed to create seller');
                }
            }
            await fetchSellers();
            setShowAddModal(false);
            alert('✅ Vendeur ajouté avec succès!');
        } catch (error) {
            console.error('Error adding seller:', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    const handleApproveSeller = async (sellerId) => {
        if (window.confirm('Êtes-vous sûr de vouloir approuver ce vendeur?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/sellers/${sellerId}/approve`, {
                    method: 'PUT',
                    headers: { 'X-Admin-Role': 'super_admin' },
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to approve seller');
                }
                await fetchSellers();
                alert('✅ Vendeur approuvé avec succès!');
            } catch (error) {
                console.error('Error approving seller:', error);
                alert(`Erreur: ${error.message}`);
            }
        }
    };

    const handleEditClick = (seller) => {
        setCurrentSeller(seller);
        setShowEditModal(true);
    };

    const handleUpdateSeller = async (e) => {
        e.preventDefault();
        if (!currentSeller) return;

        try {
            const response = await fetch(`${API_BASE_URL}/sellers/${currentSeller.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Role': 'super_admin' },
                body: JSON.stringify(currentSeller),
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
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce vendeur?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/sellers/${sellerId}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-Role': 'super_admin' },
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
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'XAF',
          minimumFractionDigits: 0,
        }).format(price);
      };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Gestion des vendeurs ({sellers.length})</h2>
                <button onClick={() => setShowAddModal(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                    + Ajouter un Vendeur
                </button>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">🏪 Ajouter un nouveau vendeur</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleAddSeller} className="space-y-4">
                            <input type="text" name="businessName" value={newSellerData.businessName} onChange={handleInputChange} placeholder="Nom de la boutique" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="name" value={newSellerData.name} onChange={handleInputChange} placeholder="Nom du propriétaire" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="tel" name="whatsapp" value={newSellerData.whatsapp} onChange={handleInputChange} placeholder="WhatsApp" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="email" name="email" value={newSellerData.email} onChange={handleInputChange} placeholder="Email" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="password" name="password" value={newSellerData.password} onChange={handleInputChange} placeholder="Mot de passe" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="address" value={newSellerData.address} onChange={handleInputChange} placeholder="Adresse" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="city" value={newSellerData.city} onChange={handleInputChange} placeholder="Ville" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="region" value={newSellerData.region} onChange={handleInputChange} placeholder="Région" className="w-full px-4 py-3 border rounded-lg" required />
                            <textarea name="description" value={newSellerData.description} onChange={handleInputChange} placeholder="Description de la boutique" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="categories" value={newSellerData.categories} onChange={handleInputChange} placeholder="Catégories (séparées par des virgules)" className="w-full px-4 py-3 border rounded-lg" required />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold">Ajouter le vendeur</button>
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
                            <input type="text" name="address" value={currentSeller.address} onChange={handleEditInputChange} placeholder="Adresse" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="city" value={currentSeller.city} onChange={handleEditInputChange} placeholder="Ville" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="region" value={currentSeller.region} onChange={handleEditInputChange} placeholder="Région" className="w-full px-4 py-3 border rounded-lg" required />
                            <textarea name="description" value={currentSeller.description} onChange={handleEditInputChange} placeholder="Description de la boutique" className="w-full px-4 py-3 border rounded-lg" required />
                            <input type="text" name="categories" value={currentSeller.categories} onChange={handleEditInputChange} placeholder="Catégories (séparées par des virgules)" className="w-full px-4 py-3 border rounded-lg" required />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold">Mettre à jour</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boutique</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sellers.map((seller) => (
                                <tr key={seller.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{seller.businessName}</td>
                                    <td className="px-6 py-4 text-sm">{seller.whatsapp} <br/> {seller.email}</td>
                                    <td className="px-6 py-4 text-sm">{seller.city}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${seller.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {seller.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {seller.status === 'pending' && (
                                            <button onClick={() => handleApproveSeller(seller.id)} className="text-green-600 hover:text-green-800 font-semibold text-sm">Approuver</button>
                                        )}
                                        <button onClick={() => handleEditClick(seller)} className="text-blue-600 hover:text-blue-800 font-semibold text-sm ml-4">Modifier</button>
                                        <button onClick={() => handleDeleteSeller(seller.id)} className="text-red-600 hover:text-red-800 font-semibold text-sm ml-4">Supprimer</button>
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
