import React, { useState, useEffect } from 'react';
import SellerHeader from './SellerHeader';
import { Modal, StatusBadge, StatusSelect } from '../admin/AdminUI';
import { WhatsAppIcon } from '../ui/Icons';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const STATUSES = ['pending', 'shipped', 'delivered', 'cancelled'];
const FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'À confirmer' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
];

const formatXAF = (value) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value || 0)} XAF`;

// Lien wa.me au format international, que le numéro ait déjà l'indicatif 237 ou non
const whatsappLink = (phone) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith('237') ? digits : `237${digits}`}`;
};

const WhatsAppButton = ({ phone, children }) => {
  const href = whatsappLink(phone);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="adm-btn bg-green-700 hover:bg-green-800 text-white">
      <WhatsAppIcon className="w-4 h-4" />
      {children}
    </a>
  );
};

const OrderDetail = ({ order, onClose }) => (
  <Modal title={`Commande ${order.id}`} onClose={onClose} size="max-w-lg">
    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-gray-600">Date</dt>
      <dd>{new Date(order.orderedDate).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</dd>
      <dt className="text-gray-600">Statut</dt>
      <dd><StatusBadge status={order.status} /></dd>
      <dt className="text-gray-600">Client</dt>
      <dd className="font-semibold">{order.buyerName}</dd>
      <dt className="text-gray-600">Livraison</dt>
      <dd>{order.pickupPointName ? `Retrait au point ${order.pickupPointName}` : 'Livraison à domicile'}</dd>
    </dl>

    {order.shippingAddress && (
      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
        <p className="font-semibold">Adresse de livraison</p>
        <p>{order.shippingAddress}</p>
        <p>{[order.shippingCity, order.shippingRegion].filter(Boolean).join(', ')}</p>
        {order.shippingPhone && <p>Tél. {order.shippingPhone}</p>}
      </div>
    )}

    <h3 className="mt-5 mb-2 font-bold text-purple-950">Articles</h3>
    <ul className="divide-y divide-gray-100">
      {order.products.map((p, i) => (
        <li key={p.productId || i} className="flex items-center gap-3 py-2">
          <img
            src={p.image || '/images/logo-nengoo.png'}
            alt=""
            className="w-12 h-12 object-cover rounded-lg bg-gray-100"
            onError={(e) => { e.target.onerror = null; e.target.src = '/images/logo-nengoo.png'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{p.name}</p>
            <p className="text-xs text-gray-600">Quantité : {p.quantity}</p>
          </div>
          <span className="price text-sm tabular-nums">{formatXAF(p.price * p.quantity)}</span>
        </li>
      ))}
    </ul>
    <p className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold">
      <span>Total</span>
      <span className="price text-lg text-purple-950 tabular-nums">{formatXAF(order.totalAmount)}</span>
    </p>

    <div className="mt-5 flex flex-wrap gap-2">
      <WhatsAppButton phone={order.shippingPhone || order.buyerWhatsapp}>Écrire au client</WhatsAppButton>
      <button type="button" onClick={onClose} className="adm-btn adm-btn-secondary">Fermer</button>
    </div>
  </Modal>
);

const SellerOrders = (props) => {
  const { user } = props;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const response = await fetch(`${API_BASE_URL}/orders?seller_id=${user.id}`, {
          headers: { 'X-Seller-Id': user.id },
        });
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders([...data].sort((a, b) => new Date(b.orderedDate) - new Date(a.orderedDate)));
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Impossible de charger vos commandes. Rechargez la page pour réessayer.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Seller-Id': user.id },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update order status');
      const updatedOrder = await response.json();
      setOrders(list => list.map(o => (o.id === orderId ? updatedOrder : o)));
      setError('');
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Le statut n\'a pas pu être modifié. Réessayez.');
    }
  };

  const counts = Object.fromEntries(FILTERS.map(f => [
    f.value, f.value === 'all' ? orders.length : orders.filter(o => o.status === f.value).length,
  ]));
  const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

  return (
    <div>
      <SellerHeader title="Commandes" description="Confirmez, expédiez et suivez les commandes de vos clients." />
      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilterStatus(f.value)}
            aria-pressed={filterStatus === f.value}
            className={`adm-btn ${filterStatus === f.value ? 'adm-btn-primary' : 'adm-btn-secondary'}`}
          >
            {f.label}
            <span className="tabular-nums opacity-75">{counts[f.value]}</span>
          </button>
        ))}
      </div>

      {error && <p className="adm-card p-4 mb-4 text-red-700" role="alert">{error}</p>}

      {loading ? (
        <p className="adm-card px-5 py-12 text-center text-gray-600">Chargement des commandes…</p>
      ) : filteredOrders.length === 0 ? (
        <div className="adm-card px-5 py-12 text-center">
          <h2 className="text-lg font-extrabold text-purple-950">
            {filterStatus === 'all' ? 'Aucune commande pour le moment' : 'Aucune commande dans cette catégorie'}
          </h2>
          <p className="mt-1 text-gray-600">
            {filterStatus === 'all'
              ? 'Les commandes de vos clients apparaîtront ici. Pensez à partager le lien de votre boutique.'
              : 'Choisissez un autre filtre pour voir vos autres commandes.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredOrders.map(order => (
            <li key={order.id} className="adm-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-purple-950">{order.buyerName}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.orderedDate).toLocaleDateString('fr-FR')}
                    {' — '}
                    {order.products.length} article{order.products.length > 1 ? 's' : ''}
                  </p>
                </div>
                <p className="price text-xl text-purple-950 tabular-nums">{formatXAF(order.totalAmount)}</p>
              </div>

              <p className="mt-2 text-sm text-gray-700 line-clamp-1">
                {order.products.map(p => `${p.name} × ${p.quantity}`).join(', ')}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusSelect
                  value={order.status}
                  onChange={(status) => updateOrderStatus(order.id, status)}
                  options={STATUSES}
                  label={`Statut de la commande de ${order.buyerName}`}
                />
                <button type="button" onClick={() => setSelectedOrder(order)} className="adm-btn adm-btn-secondary">
                  Détails
                </button>
                <WhatsAppButton phone={order.shippingPhone || order.buyerWhatsapp}>Écrire au client</WhatsAppButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SellerOrders;
