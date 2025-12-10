
import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const OrderManagement = ({ orders, user, onOrderUpdate }) => {
    const [loading, setLoading] = useState(false); // For update and delete operations
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    const toggleProducts = (orderId) => {
        setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    };

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

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la commande ${orderId} ? Cette action est irréversible.`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'X-Admin-Role': user.role
                }
            });

            if (response.status === 204) {
                 if (onOrderUpdate) {
                    onOrderUpdate();
                }
                alert(`Commande ${orderId} supprimée avec succès.`);
            } else if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete order');
            } else {
                 if (onOrderUpdate) {
                    onOrderUpdate();
                }
                alert(`Commande ${orderId} supprimée avec succès.`);
            }

        } catch (error) {
            console.error("Error deleting order:", error);
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
            <h2 className="text-xl md:text-3xl font-bold mb-6">Gestion des commandes ({orders.length})</h2>
            
            <div className="bg-white rounded-lg shadow-md overflow-auto">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-2 py-3"></th> {/* For expand button */}
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
                                <React.Fragment key={order.id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-2 py-4">
                                            <button onClick={() => toggleProducts(order.id)} className="text-gray-500 hover:text-gray-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${expandedOrderId === order.id ? 'transform rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{order.id}</td>
                                        <td className="px-6 py-4 text-sm">{order.buyerName}</td>
                                        <td className="px-6 py-4 text-sm">{order.sellerName}</td>
                                        <td className="px-6 py-4 text-sm font-medium">{formatPrice(order.totalAmount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex items-center space-x-2">
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
                                            {user && user.role === 'super_admin' && (
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Supprimer la commande"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedOrderId === order.id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan="7" className="px-12 py-4">
                                                <div>
                                                    <h4 className="font-bold text-md mb-2">Détails de la Commande</h4>
                                                    <p className="text-sm text-gray-600 mb-2">Vendu par : <span className="font-medium">{order.sellerName}</span></p>

                                                    <p className="text-sm text-gray-600 mb-2">Client : <span className="font-medium">{order.buyerName}</span></p>
                                                    {order.buyerWhatsapp && (
                                                        <p className="text-sm text-gray-600 mb-2">WhatsApp Client : <span className="font-medium">{order.buyerWhatsapp}</span></p>
                                                    )}

                                                    <p className="text-sm text-gray-600 mb-2">
                                                        Moyen de livraison :
                                                        {order.pickupPointName ? (
                                                            <span className="font-medium"> Retrait à "{order.pickupPointName}"</span>
                                                        ) : (
                                                            <span className="font-medium"> Livraison à domicile</span>
                                                        )}
                                                    </p>
                                                    
                                                    <h4 className="font-bold text-md mt-4 mb-2">Produits commandés</h4>
                                                    <ul className="divide-y divide-gray-200">
                                                        {order.products.map(product => (
                                                            <li key={product.productId} className="py-2 flex justify-between items-center">
                                                                <div>
                                                                    <p className="font-medium">{product.name}</p>
                                                                    <p className="text-sm text-gray-500">Quantité: {product.quantity}</p>
                                                                </div>
                                                                <p className="font-medium">{formatPrice(product.price * product.quantity)}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default OrderManagement;
