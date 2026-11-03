
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { notify, confirmAction, statusLabel } from './adminFeedback';
import { SectionHeader, Toolbar, SearchInput, SelectionBar, StatusSelect, EmptyRow } from './AdminUI';
import { ORDER_STATUSES, nextOrderStatuses, normalizeOrderStatus, orderStatusLabel } from '../../lib/orderStatuses';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const OrderManagement = ({ orders, user, onOrderUpdate }) => {
    const [loading, setLoading] = useState(false); // For update and delete operations
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    // Suivi par vendeur : filtre dans l'URL (?section=orders&vendeur=<id>), lien depuis la fiche vendeur
    const [searchParams, setSearchParams] = useSearchParams();
    const sellerFilter = searchParams.get('vendeur') || 'all';
    const [view, setView] = useState('orders'); // orders | sellers
    const setSellerFilter = (sellerId) => {
        const next = new URLSearchParams(searchParams);
        if (sellerId === 'all') next.delete('vendeur'); else next.set('vendeur', sellerId);
        setSearchParams(next);
    };
    // Livreurs actifs, proposés pour les livraisons à domicile
    const [couriers, setCouriers] = useState([]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/couriers`)
            .then(r => (r.ok ? r.json() : []))
            .then(list => setCouriers(list.filter(c => c.active)))
            .catch(() => setCouriers([]));
    }, []);

    const assignCourier = async (orderId, courierId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}/courier`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courierId: courierId || null }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.detail || 'L\'attribution a échoué.');
            notify(data.courierName ? `Commande ${orderId} confiée à ${data.courierName}.` : `Commande ${orderId} sans livreur.`, 'success');
            if (onOrderUpdate) onOrderUpdate();
        } catch (error) {
            notify(error.message, 'error');
        }
    };

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

    const STATUSES = ORDER_STATUSES.map(s => s.value);
    const isSuperAdmin = user && user.role === 'super_admin';

    const filteredOrders = orders.filter(order => {
        const query = searchQuery.toLowerCase();
        const productNames = order.products ? order.products.map(p => (p.name || '').toLowerCase()).join(' ') : '';
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesSeller = sellerFilter === 'all' || order.sellerId === sellerFilter;
        return matchesStatus && matchesSeller && (
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

    // Bilan par vendeur : où en sont ses commandes
    const STAGE = (status) => {
        const s = normalizeOrderStatus(status);
        if (s === 'received' || s === 'confirmed') return 'toHandle';
        if (s === 'delivered') return 'delivered';
        if (s === 'cancelled' || s === 'refunded') return 'cancelled';
        return 'inProgress';
    };
    const sellers = Object.values(orders.reduce((acc, order) => {
        const row = acc[order.sellerId] || (acc[order.sellerId] = {
            sellerId: order.sellerId, sellerName: order.sellerName, total: 0,
            toHandle: 0, inProgress: 0, delivered: 0, cancelled: 0, revenue: 0, last: null,
        });
        row.total += 1;
        row[STAGE(order.status)] += 1;
        if (STAGE(order.status) === 'delivered') row.revenue += order.totalAmount || 0;
        const date = order.orderedDate || order.createdAt;
        if (date && (!row.last || date > row.last)) row.last = date;
        return acc;
    }, {})).sort((a, b) => b.toHandle - a.toHandle || b.total - a.total);
    const selectedSeller = sellers.find(s => s.sellerId === sellerFilter);
    const tabClass = (active) => `!min-h-0 h-9 px-4 rounded-full text-sm font-semibold border transition-colors ${
        active ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
    }`;
    const fmtDateTime = (value) => (value ? new Date(String(value).endsWith('Z') ? value : `${value}Z`).toLocaleString('fr-FR', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }) : '');

    return (
        <div>
            <SectionHeader
                title={selectedSeller ? `Commandes de ${selectedSeller.sellerName}` : 'Commandes'}
                count={view === 'sellers' ? sellers.length : filteredOrders.length}
                actions={selectedSeller && view === 'orders' && (
                    <button type="button" onClick={() => setSellerFilter('all')} className="adm-btn adm-btn-secondary">Tous les vendeurs</button>
                )}
            />

            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Affichage">
                <button type="button" role="tab" aria-selected={view === 'orders'} onClick={() => setView('orders')} className={tabClass(view === 'orders')}>
                    Toutes les commandes
                </button>
                <button type="button" role="tab" aria-selected={view === 'sellers'} onClick={() => setView('sellers')} className={tabClass(view === 'sellers')}>
                    Suivi par vendeur
                </button>
            </div>

            {view === 'sellers' && (
                <div className="adm-card overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="adm-th">Vendeur</th>
                                <th className="adm-th text-right">Commandes</th>
                                <th className="adm-th text-right">À traiter</th>
                                <th className="adm-th text-right">En cours</th>
                                <th className="adm-th text-right">Livrées</th>
                                <th className="adm-th text-right">Annulées</th>
                                <th className="adm-th text-right">Ventes livrées</th>
                                <th className="adm-th">Dernière</th>
                                <th className="adm-th"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sellers.length === 0 ? (
                                <EmptyRow colSpan={9}>Aucune commande pour le moment.</EmptyRow>
                            ) : sellers.map(s => (
                                <tr key={s.sellerId} className="hover:bg-gray-50">
                                    <td className="adm-td font-semibold">{s.sellerName}</td>
                                    <td className="adm-td text-right tabular-nums">{s.total}</td>
                                    <td className={`adm-td text-right tabular-nums ${s.toHandle ? 'font-bold text-yellow-800' : 'text-gray-400'}`}>{s.toHandle}</td>
                                    <td className={`adm-td text-right tabular-nums ${s.inProgress ? '' : 'text-gray-400'}`}>{s.inProgress}</td>
                                    <td className={`adm-td text-right tabular-nums ${s.delivered ? 'text-green-800' : 'text-gray-400'}`}>{s.delivered}</td>
                                    <td className={`adm-td text-right tabular-nums ${s.cancelled ? '' : 'text-gray-400'}`}>{s.cancelled}</td>
                                    <td className="adm-td text-right price whitespace-nowrap">{formatPrice(s.revenue)}</td>
                                    <td className="adm-td whitespace-nowrap text-gray-600">{s.last ? orderDate({ orderedDate: s.last }) : ''}</td>
                                    <td className="adm-td text-right">
                                        <button type="button" onClick={() => { setSellerFilter(s.sellerId); setView('orders'); }} className="adm-link !min-h-0 whitespace-nowrap">
                                            Voir ses commandes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'orders' && (<>
            <Toolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher par n°, acheteur, vendeur ou produit" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrer par statut" className="adm-input w-auto">
                    <option value="all">Tous les statuts</option>
                    {STATUSES.map(s => (
                        <option key={s} value={s}>{statusLabel(s)} ({orders.filter(o => o.status === s).length})</option>
                    ))}
                </select>
                <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} aria-label="Filtrer par vendeur" className="adm-input w-auto">
                    <option value="all">Tous les vendeurs</option>
                    {[...sellers].sort((a, b) => (a.sellerName || '').localeCompare(b.sellerName || '', 'fr')).map(s => (
                        <option key={s.sellerId} value={s.sellerId}>{s.sellerName} ({s.total})</option>
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
                                                options={nextOrderStatuses(order.status, { isAdmin: ['admin', 'super_admin'].includes(user?.role) })}
                                                label={`Statut de la commande ${order.id}`}
                                            />
                                            {!order.pickupPointId && !['delivered', 'cancelled', 'refunded'].includes(order.status) && (
                                                <select
                                                    value={order.courierId || ''}
                                                    onChange={(e) => assignCourier(order.id, e.target.value)}
                                                    aria-label={`Livreur de la commande ${order.id}`}
                                                    className="mt-2 block !min-h-0 h-9 text-xs rounded-lg border border-gray-300 px-2"
                                                >
                                                    <option value="">Sans livreur</option>
                                                    {couriers.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>)}
                                                </select>
                                            )}
                                            {order.courierName && ['delivered'].includes(order.status) && (
                                                <p className="mt-1 text-xs text-gray-500">Livrée par {order.courierName}</p>
                                            )}
                                            {(order.deliveryAttempts || []).length > 0 && order.status !== 'delivered' && (
                                                <p className="mt-1 text-xs text-orange-700">
                                                    {order.deliveryAttempts.length} tentative(s) : {order.deliveryAttempts[order.deliveryAttempts.length - 1].note || 'sans motif'}
                                                </p>
                                            )}
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
                                                            {!order.pickupPointId && (
                                                                <dd>{[order.shippingNeighborhood, order.shippingCity].filter(Boolean).join(', ')}</dd>
                                                            )}
                                                            {order.shippingLandmark && <dd className="text-gray-600">Repère : {order.shippingLandmark}</dd>}
                                                            {order.courierName && <dd className="text-gray-600">Livreur : {order.courierName}</dd>}
                                                            {order.deliveryCode && <dd className="text-gray-600">Code de livraison : {order.deliveryCode}</dd>}
                                                        </div>
                                                        <div>
                                                            <dt className="text-gray-500">Suivi</dt>
                                                            {(order.statusHistory && order.statusHistory.length > 0 ? order.statusHistory : [{ status: order.status, at: order.orderedDate }]).map((step, i) => (
                                                                <dd key={i} className="flex justify-between gap-3">
                                                                    <span className="font-medium">{orderStatusLabel(step.status)}</span>
                                                                    <span className="text-gray-500 whitespace-nowrap">{fmtDateTime(step.at)}</span>
                                                                </dd>
                                                            ))}
                                                            {(order.deliveryAttempts || []).map((attempt, i) => (
                                                                <dd key={`a${i}`} className="text-orange-700">Tentative {fmtDateTime(attempt.at)} : {attempt.note || 'sans motif'}</dd>
                                                            ))}
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
            </>)}
        </div>
    );
};

export default OrderManagement;
