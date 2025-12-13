


import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const BuyerManagement = (props) => {
    const { user } = props;
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBuyers, setSelectedBuyers] = useState([]);

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
            
            // Optimistic update of the local state
            setBuyers(buyers.map(b => b.id === buyer.id ? { ...b, status: newStatus } : b));
            alert(`✅ Statut de l'acheteur mis à jour à "${newStatus}".`);

        } catch (error) {
            console.error("Error updating buyer status:", error);
            alert(`Erreur: ${error.message}`);
            // Revert optimistic update on failure
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

            <div className="mb-4 flex justify-between items-center">
                <input
                    type="text"
                    placeholder="Rechercher des acheteurs..."
                    className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                    onClick={handleBulkDelete}
                    disabled={selectedBuyers.length === 0}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                >
                    Supprimer la sélection
                </button>
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
                                    <td className="px-6 py-4 font-medium">{buyer.name}</td>
                                    <td className="px-6 py-4 text-sm">{buyer.whatsapp}</td>
                                    <td className="px-6 py-4 text-sm">{buyer.email}</td>
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default BuyerManagement;


