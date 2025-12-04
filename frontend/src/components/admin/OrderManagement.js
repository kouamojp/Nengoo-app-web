
import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const OrderManagement = ({ orders, user, onOrderUpdate }) => {
    const [loading, setLoading] = useState(false); // Only for update operations

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user.role // Use actual user role
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update order status');
            }
            // Call the callback to tell the parent to re-fetch orders
            if (onOrderUpdate) {
                onOrderUpdate();
            }
            alert(`Statut de la commande ${orderId} mis à jour à "${newStatus}".`);
        } catch (error) {
            console.error("Error updating order status:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
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
            <h2 className="text-3xl font-bold mb-6">Gestion des commandes ({orders.length})</h2>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acheteur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendeur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{order.id}</td>
                                    <td className="px-6 py-4 text-sm">{order.buyerName}</td>
                                    <td className="px-6 py-4 text-sm">{order.sellerName}</td>
                                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(order.totalAmount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={order.status} 
                                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                            className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="pending">En attente</option>
                                            <option value="processing">En traitement</option>
                                            <option value="shipped">Expédiée</option>
                                            <option value="delivered">Livrées</option>
                                            <option value="cancelled">Annulée</option>
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

export default OrderManagement;
