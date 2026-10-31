import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import SellerProducts from './SellerProducts';
import SellerOrders from './SellerOrders';
import SellerAnalytics from './SellerAnalytics';
import SellerMessages from './SellerMessages';
import SellerProfile from './SellerProfile';
import { StatusBadge } from '../admin/AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

export const formatXAF = (value) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value || 0)} XAF`;

const Stat = ({ label, value, hint }) => (
  <div className="adm-card p-5">
    <p className="text-sm font-semibold text-gray-600">{label}</p>
    <p className="price mt-1 text-3xl text-purple-950 tabular-nums">{value}</p>
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

// Une action à faire en priorité, avec son bouton
const Task = ({ title, text, to, cta }) => (
  <div className="adm-card p-5 flex flex-wrap items-center gap-4 border-l-4 !border-l-purple-700">
    <div className="flex-1 min-w-[14rem]">
      <p className="font-bold text-purple-950">{title}</p>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
    <Link to={to} className="adm-btn adm-btn-primary">{cta}</Link>
  </div>
);

const Overview = ({ user, orders, analytics, loading }) => {
  const pending = orders.filter(o => o.status === 'pending');
  const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
  const monthRevenue = analytics?.monthly_revenue?.find(m => m.month === currentMonth)?.revenue || 0;
  const productCount = analytics?.total_products ?? null;
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <>
      <SellerHeader
        title={firstName ? `Bonjour ${firstName}` : 'Vue d\'ensemble'}
        description={`Votre boutique ${user?.businessName || ''} en un coup d'œil.`}
      />

      {!loading && (
        <section aria-label="À faire" className="space-y-3 mb-8">
          {pending.length > 0 && (
            <Task
              title={`${pending.length} commande${pending.length > 1 ? 's' : ''} à confirmer`}
              text="Le client attend votre confirmation pour la livraison."
              to="/seller/orders"
              cta="Voir les commandes"
            />
          )}
          {productCount === 0 && (
            <Task
              title="Ajoutez votre premier produit"
              text="Votre boutique est visible dès qu'elle contient un produit."
              to="/seller/products"
              cta="Ajouter un produit"
            />
          )}
          {!user?.logoUrl && (
            <Task
              title="Ajoutez le logo de votre boutique"
              text="Il apparaît sur vos produits et votre page boutique."
              to="/seller/profile"
              cta="Compléter le profil"
            />
          )}
        </section>
      )}

      <section aria-label="Chiffres clés" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Revenus du mois" value={loading ? '…' : formatXAF(monthRevenue)} />
        <Stat label="Commandes" value={loading ? '…' : (analytics?.total_orders ?? orders.length)} hint="Depuis l'ouverture" />
        <Stat label="À confirmer" value={loading ? '…' : pending.length} />
        <Stat label="Produits" value={loading ? '…' : (productCount ?? '—')} />
      </section>

      <section className="adm-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-extrabold text-purple-950">Dernières commandes</h2>
          <Link to="/seller/orders" className="adm-link text-sm">Toutes les commandes</Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-600">
            {loading ? 'Chargement…' : 'Aucune commande pour le moment. Elles apparaîtront ici dès qu\'un client achète.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="adm-th">Client</th>
                  <th className="adm-th">Date</th>
                  <th className="adm-th text-right">Montant</th>
                  <th className="adm-th">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id}>
                    <td className="adm-td font-semibold">{order.buyerName}</td>
                    <td className="adm-td text-gray-600">{new Date(order.orderedDate).toLocaleDateString('fr-FR')}</td>
                    <td className="adm-td text-right price tabular-nums">{formatXAF(order.totalAmount)}</td>
                    <td className="adm-td"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

const SECTIONS = {
  products: SellerProducts,
  orders: SellerOrders,
  analytics: SellerAnalytics,
  messages: SellerMessages,
  profile: SellerProfile,
};

const SellerDashboard = (props) => {
  const { user, setUser, section = 'dashboard' } = props;
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || user.type !== 'seller') return;
    setLoading(true);
    try {
      const [ordersRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders?seller_id=${user.id}`, { headers: { 'X-Seller-Id': user.id } }),
        fetch(`${API_BASE_URL}/sellers/${user.id}/analytics`, { headers: { 'X-Seller-Id': user.id } }),
      ]);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders([...data].sort((a, b) => new Date(b.orderedDate) - new Date(a.orderedDate)));
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (error) {
      console.error('Erreur de chargement du tableau de bord vendeur:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData, section]);

  // L'utilisateur est restauré depuis localStorage après le premier rendu
  if (!user) {
    return localStorage.getItem('nengoo-user') ? null : <Navigate to="/login/seller" replace />;
  }
  if (user.type !== 'seller') return <Navigate to="/" replace />;

  const Section = SECTIONS[section];
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <SellerSidebar user={user} setUser={setUser} active={section} pendingOrders={pendingOrders}>
      {Section
        ? <Section {...props} />
        : <Overview user={user} orders={orders} analytics={analytics} loading={loading} />}
    </SellerSidebar>
  );
};

export default SellerDashboard;
