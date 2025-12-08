


import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const BuyerManagement = (props) => {
    const { user } = props;
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);

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
            <h2 className="text-3xl font-bold mb-6">Gestion des acheteurs ({buyers.length})</h2>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total dépensé</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {buyers.map((buyer) => (
                                <tr key={buyer.id} className="hover:bg-gray-50">
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


