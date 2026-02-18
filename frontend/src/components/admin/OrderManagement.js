
import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const OrderManagement = ({ orders, user, onOrderUpdate }) => {
    const [loading, setLoading] = useState(false); // For update and delete operations
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrders, setSelectedOrders] = useState([]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedOrders(filteredOrders.map(o => o.id));
        } else {
            setSelectedOrders([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedOrders([...selectedOrders, id]);
        } else {
            setSelectedOrders(selectedOrders.filter(orderId => orderId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedOrders.length} commandes? Cette action est irréversible.`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/orders`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': user.role,
                    },
                    body: JSON.stringify({ ids: selectedOrders }),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete orders');
                }
                if (onOrderUpdate) {
                    onOrderUpdate();
                }
                setSelectedOrders([]);
                alert('🗑️ Commandes supprimées avec succès!');
            } catch (error) {
                console.error('Error deleting orders:', error);
                alert(`Erreur: ${error.message}`);
            }
        }
    };

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

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'En attente';
            case 'processing': return 'En cours';
            case 'shipped': return 'Expédiée';
            case 'delivered': return 'Livrée';
            case 'cancelled': return 'Annulée';
            default: return status;
        }
    };

    const filteredOrders = orders.filter(order => {
        const query = searchQuery.toLowerCase();
        const productNames = order.products ? order.products.map(p => p.name.toLowerCase()).join(' ') : '';
        return (
            order.id.toString().toLowerCase().includes(query) ||
            order.buyerName.toLowerCase().includes(query) ||
            order.sellerName.toLowerCase().includes(query) ||
            productNames.includes(query)
        );
    });

    return (
        <div>
            <h2 className="text-xl md:text-3xl font-bold mb-6">Gestion des commandes ({filteredOrders.length})</h2>
            
            <div className="mb-4 flex justify-between items-center max-sm:flex-wrap max-sm:gap-4">
                <input
                    type="text"
                    placeholder="Rechercher des commandes..."
                    className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {user && user.role === 'super_admin' && (
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedOrders.length === 0}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                    >
                        Supprimer la sélection
                    </button>
                )}
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
                                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                    />
                                </th>
                                <th className="px-2 py-3"></th> {/* For expand button */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acheteur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendeur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredOrders.map((order) => (
                                <React.Fragment key={order.id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.includes(order.id)}
                                                onChange={(e) => handleSelectOne(e, order.id)}
                                            />
                                        </td>
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
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {order.products && order.products.slice(0, 3).map((product, index) => (
                                                    product.images && product.images[0] ? (
                                                        <img
                                                            key={index}
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            className="w-10 h-10 object-cover rounded border border-gray-200"
                                                            title={product.name}
                                                        />
                                                    ) : (
                                                        <div key={index} className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )
                                                ))}
                                                {order.products && order.products.length > 3 && (
                                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                                                        +{order.products.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">{formatPrice(order.totalAmount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {getStatusText(order.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex items-center space-x-2">
                                            <select 
                                                value={order.status} 
                                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                                className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="pending">En attente</option>
                                                <option value="processing">En cours</option>
                                                <option value="shipped">Expédiée</option>
                                                <option value="delivered">Livrée</option>
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
                                            <td colSpan="9" className="px-12 py-4">
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
                                                            <li key={product.productId} className="py-3 flex justify-between items-center">
                                                                <div className="flex items-center gap-3">
                                                                    {product.images && product.images[0] ? (
                                                                        <img
                                                                            src={product.images[0]}
                                                                            alt={product.name}
                                                                            className="w-16 h-16 object-cover rounded border border-gray-200"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <p className="font-medium">{product.name}</p>
                                                                        <p className="text-sm text-gray-500">Quantité: {product.quantity}</p>
                                                                    </div>
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
