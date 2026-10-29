
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductManagement from './ProductManagement';
import SellerManagement from './SellerManagement';
import PickupPointManagement from './PickupPointManagement';
import BuyerManagement from './BuyerManagement';
import OrderManagement from './OrderManagement';
import CategoryManagement from './CategoryManagement';
import ShippingSettingsManagement from './ShippingSettingsManagement';
import HomepageManagement from './HomepageManagement';
import AboutPageManagement from './AboutPageManagement';
import WhatsAppAnalytics from './WhatsAppAnalytics';
import AdminLayout, { useAdminPendingCounts } from './AdminLayout';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SECTIONS = ['dashboard', 'orders', 'products', 'sellers', 'buyers', 'whatsappAnalytics', 'categories', 'pickupPoints', 'homepage', 'about', 'shipping'];

const formatPrice = (price) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
}).format(price || 0);

const ORDER_STATUS = {
    pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-900' },
    processing: { label: 'En cours', className: 'bg-purple-100 text-purple-900' },
    shipped: { label: 'Expédiée', className: 'bg-purple-100 text-purple-900' },
    delivered: { label: 'Livrée', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Annulée', className: 'bg-gray-100 text-gray-600' },
};

const Overview = ({ user, orders, counts, onSelect }) => {
    const queue = [
        {
            count: counts.sellers,
            text: (n) => `${n} vendeur${n > 1 ? 's attendent' : ' attend'} votre validation`,
            hint: 'Leur boutique reste invisible tant qu\'elle n\'est pas approuvée.',
            action: 'Valider les vendeurs',
            section: 'sellers',
        },
        {
            count: counts.orders,
            text: (n) => `${n} commande${n > 1 ? 's' : ''} en attente`,
            hint: 'Passez-les en cours dès que le vendeur a confirmé.',
            action: 'Traiter les commandes',
            section: 'orders',
        },
    ].filter(item => item.count > 0);

    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt || b.orderedDate) - new Date(a.createdAt || a.orderedDate))
        .slice(0, 6);

    return (
        <div className="space-y-10">
            <div>
                <h1 className="font-display text-4xl sm:text-5xl text-purple-950">Bonjour {user.name}</h1>
                <p className="adm-subtitle">Voici ce qui demande votre attention sur Nengoo.</p>
            </div>

            <section aria-labelledby="queue-title">
                <h2 id="queue-title" className="text-xl font-extrabold mb-3">À traiter</h2>
                {counts.error ? (
                    <p className="adm-card p-5 text-gray-700" role="alert">
                        Impossible de vérifier les vendeurs et les commandes en attente. Vérifiez votre connexion, puis rechargez la page.
                    </p>
                ) : queue.length > 0 ? (
                    <ul className="adm-card divide-y divide-gray-200">
                        {queue.map(item => (
                            <li key={item.section} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                                <span className="price shrink-0 min-w-[3rem] h-12 px-2 rounded-xl bg-yellow-300 text-purple-950 text-2xl flex items-center justify-center">
                                    {item.count}
                                </span>
                                <div className="flex-1 min-w-[12rem]">
                                    <p className="font-bold">{item.text(item.count)}</p>
                                    <p className="text-sm text-gray-600">{item.hint}</p>
                                </div>
                                <button type="button" onClick={() => onSelect(item.section)} className="adm-btn adm-btn-primary">
                                    {item.action}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="adm-card p-5 text-gray-700">Rien à traiter pour le moment : aucun vendeur ni aucune commande en attente.</p>
                )}
            </section>

            <section aria-labelledby="recent-title">
                <div className="flex items-baseline justify-between gap-4 mb-3">
                    <h2 id="recent-title" className="text-xl font-extrabold">Dernières commandes</h2>
                    <button type="button" onClick={() => onSelect('orders')} className="adm-link !min-h-0 text-sm">Toutes les commandes</button>
                </div>
                {recentOrders.length > 0 ? (
                    <div className="adm-card overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="adm-th">Commande</th>
                                    <th className="adm-th">Acheteur</th>
                                    <th className="adm-th">Vendeur</th>
                                    <th className="adm-th text-right">Montant</th>
                                    <th className="adm-th">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {recentOrders.map(order => {
                                    const status = ORDER_STATUS[order.status] || { label: order.status, className: 'bg-gray-100 text-gray-700' };
                                    const date = order.createdAt || order.orderedDate;
                                    return (
                                        <tr key={order.id}>
                                            <td className="adm-td">
                                                <span className="font-semibold">{order.id}</span>
                                                {date && (
                                                    <span className="block text-xs text-gray-500">
                                                        {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="adm-td">{order.buyerName}</td>
                                            <td className="adm-td">{order.sellerName}</td>
                                            <td className="adm-td text-right price whitespace-nowrap">{formatPrice(order.totalAmount)}</td>
                                            <td className="adm-td">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="adm-card p-5 text-gray-700">Aucune commande pour le moment. Elles apparaîtront ici dès qu'un acheteur passera commande.</p>
                )}
            </section>
        </div>
    );
};

const AdminDashboard = (props) => {
    const { user, setUser } = props;
    const [searchParams, setSearchParams] = useSearchParams();
    const requested = searchParams.get('section');
    const activeSection = SECTIONS.includes(requested) ? requested : 'dashboard';
    const [orders, setOrders] = useState([]); // Fetched from backend
    const counts = useAdminPendingCounts(user);

    // La section active est dans l'URL : liens partageables et bouton retour du navigateur
    const handleNavigate = (sectionId) => {
        setSearchParams(sectionId === 'dashboard' ? {} : { section: sectionId });
        window.scrollTo({ top: 0 });
    };

    const fetchOrders = async () => {
        if (!user || !user.role) return; // Ensure user and role are available
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: { 'X-Admin-Role': user.role } // Use actual user role
            });
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };

    useEffect(() => {
        if (user && user.type === 'admin') { // Check if any admin type is logged in
            fetchOrders();
        }
    }, [user]); // Re-fetch when user changes

    if (!user || user.type !== 'admin') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="adm-card max-w-md w-full p-8 text-left">
            <h1 className="adm-title">Accès réservé</h1>
            <p className="adm-subtitle mb-6">Connectez-vous avec un compte administrateur pour accéder à cette page.</p>
            <Link to="/admin/login" className="adm-btn adm-btn-primary">Se connecter</Link>
          </div>
        </div>
      );
    }

    const sectionClass = (id) => (activeSection === id ? '' : 'hidden');

    return (
      <AdminLayout user={user} setUser={setUser} active={activeSection} onSelect={handleNavigate}>
        {activeSection === 'dashboard' && (
            <Overview user={user} orders={orders} counts={counts} onSelect={handleNavigate} />
        )}
        <div className={sectionClass('sellers')}>
            <SellerManagement {...props} />
        </div>
        <div className={sectionClass('products')}>
            <ProductManagement {...props} />
        </div>
        <div className={sectionClass('pickupPoints')}>
            <PickupPointManagement {...props} />
        </div>
        <div className={sectionClass('whatsappAnalytics')}>
            <WhatsAppAnalytics {...props} />
        </div>
        <div className={sectionClass('buyers')}>
            <BuyerManagement {...props} />
        </div>
        <div className={sectionClass('orders')}>
            <OrderManagement {...props} orders={orders} onOrderUpdate={fetchOrders} />
        </div>
        <div className={sectionClass('categories')}>
            <CategoryManagement {...props} />
        </div>
        {user.role === 'super_admin' && (
            <>
                <div className={sectionClass('shipping')}>
                    <ShippingSettingsManagement {...props} />
                </div>
                <div className={sectionClass('homepage')}>
                    <HomepageManagement {...props} />
                </div>
                <div className={sectionClass('about')}>
                    <AboutPageManagement {...props} />
                </div>
            </>
        )}
      </AdminLayout>
    );
};

export default AdminDashboard;
