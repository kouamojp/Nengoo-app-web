
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const BuyerManagement = (props) => {
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBuyers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/buyers`, {
                headers: { 'X-Admin-Role': 'super_admin' }
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
    }, []);

    const toggleBuyerStatus = async (buyerId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const response = await fetch(`${API_BASE_URL}/buyers/${buyerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': 'super_admin'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update buyer status');
            }
            await fetchBuyers();
            alert(`Statut de l'acheteur mis à jour à "${newStatus}".`);
        } catch (error) {
            console.error("Error updating buyer status:", error);
            alert(`Erreur: ${error.message}`);
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                                        <span className={`px-2 py-1 text-xs rounded-full ${buyer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {buyer.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleBuyerStatus(buyer.id, buyer.status)} className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
                                            {buyer.status === 'active' ? '🚫 Suspendre' : '✅ Activer'}
                                        </button>
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
