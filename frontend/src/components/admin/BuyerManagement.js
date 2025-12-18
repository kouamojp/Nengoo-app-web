


import React, { useState, useEffect } from 'react';

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
            alert("Le nouveau mot de passe ne peut pas être vide.");
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
            alert(`✅ Mot de passe pour ${selectedBuyerForPassword.name} mis à jour!`);
        } catch (error) {
            console.error('Error updating password:', error);
            alert(`Erreur: ${error.message}`);
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
            alert('✅ Informations de l\'acheteur mises à jour!');
        } catch (error) {
            console.error('Error updating buyer:', error);
            alert(`Erreur: ${error.message}`);
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
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedBuyers.length} acheteurs? Cette action est irréversible.`)) {
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
                alert('🗑️ Acheteurs supprimés avec succès!');
            } catch (error) {
                console.error('Error deleting buyers:', error);
                alert(`Erreur: ${error.message}`);
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
            alert(`✅ Statut de l'acheteur mis à jour à "${newStatus}".`);

        } catch (error) {
            console.error("Error updating buyer status:", error);
            alert(`Erreur: ${error.message}`);
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
            buyer.name.toLowerCase().includes(query) ||
            buyer.email.toLowerCase().includes(query) ||
            buyer.whatsapp.toLowerCase().includes(query)
        );
    });

    if (!user || !['super_admin', 'admin'].includes(user.role)) {
        return (
            <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="font-bold">Permission Denied</p>
                <p>You do not have the required permissions to view this section.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl md:text-3xl font-bold mb-6">Gestion des acheteurs ({filteredBuyers.length})</h2>

            <div className="mb-4 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <input
                    type="text"
                    placeholder="Rechercher des acheteurs..."
                    className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex space-x-2">
                    <button
                        onClick={fetchBuyers}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                    >
                        Rafraîchir
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedBuyers.length === 0}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                    >
                        Supprimer la sélection
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-auto">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedBuyers.length === filteredBuyers.length && filteredBuyers.length > 0}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total dépensé</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredBuyers.map((buyer) => (
                                <tr key={buyer.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedBuyers.includes(buyer.id)}
                                            onChange={(e) => handleSelectOne(e, buyer.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {editingBuyerId === buyer.id ? (
                                            <input 
                                                type="text"
                                                value={editingData.name}
                                                onChange={(e) => setEditingData({...editingData, name: e.target.value})}
                                                className="border rounded px-2 py-1"
                                            />
                                        ) : (
                                            buyer.name
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm">{buyer.whatsapp}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {editingBuyerId === buyer.id ? (
                                            <input 
                                                type="email"
                                                value={editingData.email}
                                                onChange={(e) => setEditingData({...editingData, email: e.target.value})}
                                                className="border rounded px-2 py-1"
                                            />
                                        ) : (
                                            buyer.email
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm">{buyer.totalOrders}</td>
                                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(buyer.totalSpent)}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={buyer.status}
                                            onChange={(e) => handleStatusChange(buyer, e.target.value)}
                                            className={`p-2 rounded text-sm border-transparent focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                                buyer.status === 'active' ? 'bg-green-100 text-green-800' :
                                                buyer.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            <option value="active">Actif</option>
                                            <option value="suspended">Suspendu</option>
                                            <option value="pending">En attente</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-sm space-x-2">
                                                                                 {editingBuyerId === buyer.id ? (
                                                                                    <>
                                                                                        <button onClick={() => handleSaveClick(buyer.id)} className="text-green-600 hover:text-green-900">Enregistrer</button>
                                                                                        <button onClick={handleCancelClick} className="text-red-600 hover:text-red-900">Annuler</button>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <button onClick={() => handleEditClick(buyer)} className="text-blue-600 hover:text-blue-900">Modifier</button>
                                                                                        <button onClick={() => openPasswordModal(buyer)} className="text-gray-600 hover:text-gray-900">Mot de passe</button>
                                                                                    </>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                        
                                                    {passwordModalOpen && (
                                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                            <div className="bg-white p-6 rounded-lg shadow-xl">
                                                                <h3 className="text-lg font-bold mb-4">Changer le mot de passe pour {selectedBuyerForPassword?.name}</h3>
                                                                <input
                                                                    type="password"
                                                                    placeholder="Nouveau mot de passe"
                                                                    value={newPassword}
                                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                                    className="w-full px-4 py-2 border rounded-lg mb-4"
                                                                />
                                                                <div className="flex justify-end space-x-2">
                                                                    <button onClick={() => setPasswordModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Annuler</button>
                                                                    <button onClick={handlePasswordChange} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Enregistrer</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );};

export default BuyerManagement;


