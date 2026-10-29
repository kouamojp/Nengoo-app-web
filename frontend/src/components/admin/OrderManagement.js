
import React, { useState } from 'react';
import { notify, confirmAction, statusLabel } from './adminFeedback';
import { SectionHeader, Toolbar, SearchInput, SelectionBar, StatusSelect, EmptyRow } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const OrderManagement = ({ orders, user, onOrderUpdate }) => {
    const [loading, setLoading] = useState(false); // For update and delete operations
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');

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
        if (await confirmAction({ title: `Supprimer ${selectedOrders.length} commande(s) ?`, message: 'Elles disparaîtront aussi pour les acheteurs et les vendeurs. Cette action est définitive.' })) {
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
                notify('Commandes supprimées avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting orders:', error);
                notify(error.message, 'error');
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
            notify(`Statut de la commande ${orderId} : ${statusLabel(newStatus)}.`, 'success');
        } catch (error) {
            console.error("Error updating order status:", error);
            notify(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!(await confirmAction({ title: `Supprimer la commande ${orderId} ?`, message: "Elle disparaîtra aussi pour l'acheteur et le vendeur. Cette action est définitive." }))) {
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
                notify(`Commande ${orderId} supprimée avec succès.`, 'success');
            } else if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete order');
            } else {
                 if (onOrderUpdate) {
                    onOrderUpdate();
                }
                notify(`Commande ${orderId} supprimée avec succès.`, 'success');
            }

        } catch (error) {
            console.error("Error deleting order:", error);
            notify(error.message, 'error');
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

    const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const isSuperAdmin = user && user.role === 'super_admin';

    const filteredOrders = orders.filter(order => {
        const query = searchQuery.toLowerCase();
        const productNames = order.products ? order.products.map(p => (p.name || '').toLowerCase()).join(' ') : '';
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesStatus && (
            order.id.toString().toLowerCase().includes(query) ||
            (order.buyerName || '').toLowerCase().includes(query) ||
            (order.sellerName || '').toLowerCase().includes(query) ||
            productNames.includes(query)
        );
    });

    const orderDate = (order) => {
        const date = order.createdAt || order.orderedDate;
        return date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    };

    const ProductThumb = ({ product, size = 'w-10 h-10' }) => (
        product.images && product.images[0]
            ? <img src={product.images[0]} alt="" title={product.name} className={`${size} object-cover rounded-md bg-gray-100`} loading="lazy" />
            : <div className={`${size} rounded-md bg-gray-100`} aria-hidden="true" />
    );

    const COLUMNS = isSuperAdmin ? 7 : 6;

    return (
        <div>
            <SectionHeader title="Commandes" count={filteredOrders.length} />

            <Toolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher par n°, acheteur, vendeur ou produit" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrer par statut" className="adm-input w-auto">
                    <option value="all">Tous les statuts</option>
                    {STATUSES.map(s => (
                        <option key={s} value={s}>{statusLabel(s)} ({orders.filter(o => o.status === s).length})</option>
                    ))}
                </select>
            </Toolbar>

            {isSuperAdmin && (
                <SelectionBar count={selectedOrders.length} onDelete={handleBulkDelete} onClear={() => setSelectedOrders([])} />
            )}

            <div className="adm-card overflow-x-auto" aria-busy={loading}>
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {isSuperAdmin && (
                                <th className="adm-th w-10">
                                    <input
                                        type="checkbox"
                                        aria-label="Tout sélectionner"
                                        onChange={handleSelectAll}
                                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                    />
                                </th>
                            )}
                            <th className="adm-th">Commande</th>
                            <th className="adm-th">Acheteur</th>
                            <th className="adm-th">Vendeur</th>
                            <th className="adm-th text-right">Total</th>
                            <th className="adm-th">Statut</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredOrders.length === 0 ? (
                            <EmptyRow colSpan={COLUMNS}>
                                {orders.length === 0 ? 'Aucune commande pour le moment.' : 'Aucune commande ne correspond à ces critères.'}
                            </EmptyRow>
                        ) : filteredOrders.map((order) => {
                            const expanded = expandedOrderId === order.id;
                            return (
                                <React.Fragment key={order.id}>
                                    <tr className={selectedOrders.includes(order.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                                        {isSuperAdmin && (
                                            <td className="adm-td">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Sélectionner la commande ${order.id}`}
                                                    checked={selectedOrders.includes(order.id)}
                                                    onChange={(e) => handleSelectOne(e, order.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="adm-td">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2 shrink-0">
                                                    {(order.products || []).slice(0, 3).map((product, index) => (
                                                        <div key={index} className="ring-2 ring-white rounded-md"><ProductThumb product={product} /></div>
                                                    ))}
                                                </div>
                                                <div>
                                                    <p className="font-semibold whitespace-nowrap">{order.id}</p>
                                                    <p className="text-xs text-gray-500 whitespace-nowrap">
                                                        {orderDate(order)}
                                                        {order.products && order.products.length > 0 && `, ${order.products.length} article${order.products.length > 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="adm-td">{order.buyerName}</td>
                                        <td className="adm-td">{order.sellerName}</td>
                                        <td className="adm-td text-right price whitespace-nowrap">{formatPrice(order.totalAmount)}</td>
                                        <td className="adm-td">
                                            <StatusSelect
                                                value={order.status}
                                                onChange={(value) => handleUpdateOrderStatus(order.id, value)}
                                                options={STATUSES}
                                                label={`Statut de la commande ${order.id}`}
                                            />
                                        </td>
                                        <td className="adm-td whitespace-nowrap text-right">
                                            <button
                                                onClick={() => toggleProducts(order.id)}
                                                aria-expanded={expanded}
                                                className="adm-link !min-h-0"
                                            >
                                                {expanded ? 'Masquer' : 'Détails'}
                                            </button>
                                            {isSuperAdmin && (
                                                <button onClick={() => handleDeleteOrder(order.id)} className="adm-link-danger !min-h-0 ml-4">
                                                    Supprimer
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expanded && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={COLUMNS} className="px-4 sm:px-6 py-5">
                                                <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)] gap-6">
                                                    <dl className="text-sm space-y-3">
                                                        <div>
                                                            <dt className="text-gray-500">Acheteur</dt>
                                                            <dd className="font-semibold">{order.buyerName}</dd>
                                                            {order.buyerWhatsapp && <dd>{order.buyerWhatsapp}</dd>}
                                                        </div>
                                                        <div>
                                                            <dt className="text-gray-500">Vendeur</dt>
                                                            <dd className="font-semibold">{order.sellerName}</dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-gray-500">Livraison</dt>
                                                            <dd className="font-semibold">
                                                                {order.pickupPointName ? `Retrait à « ${order.pickupPointName} »` : 'À domicile'}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                    <ul className="divide-y divide-gray-200 bg-white rounded-xl border border-gray-200">
                                                        {(order.products || []).map((product, index) => (
                                                            <li key={product.productId || index} className="p-3 flex items-center gap-3">
                                                                <ProductThumb product={product} size="w-14 h-14" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold truncate">{product.name}</p>
                                                                    <p className="text-sm text-gray-500">Quantité : {product.quantity}</p>
                                                                </div>
                                                                <p className="price whitespace-nowrap">{formatPrice(product.price * product.quantity)}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrderManagement;
