import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HomeIcon, CartIcon, BoxIcon, StoreIcon, UsersIcon, TagIcon, PinIcon, ChartIcon,
  LayoutIcon, InfoIcon, TruckIcon, LockIcon, ShieldIcon, LogoutIcon, MenuIcon, ExternalIcon,
} from '../ui/Icons';
import { AdminFeedbackHost } from './adminFeedback';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

// Éléments en attente d'une action de l'équipe : vendeurs à valider, commandes à traiter.
export const useAdminPendingCounts = (user) => {
  const [counts, setCounts] = useState({ sellers: 0, orders: 0, error: false });

  useEffect(() => {
    if (!user || user.type !== 'admin') return;
    let cancelled = false;

    const fetchCounts = async () => {
      try {
        const [sellersRes, ordersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sellers`),
          fetch(`${API_BASE_URL}/orders`, { headers: { 'X-Admin-Role': user.role } }),
        ]);
        if (!sellersRes.ok || !ordersRes.ok) throw new Error('Pending counts unavailable');
        const sellers = await sellersRes.json();
        const orders = await ordersRes.json();
        if (!cancelled) {
          setCounts({
            sellers: sellers.filter(s => s.status === 'pending').length,
            orders: orders.filter(o => o.status === 'pending').length,
            error: false,
          });
        }
      } catch (error) {
        console.error('Erreur lors du calcul des éléments en attente:', error);
        if (!cancelled) setCounts(c => ({ ...c, error: true }));
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 120000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  return counts;
};

const navGroups = (user, counts) => [
  {
    items: [{ id: 'dashboard', label: 'Vue d\'ensemble', Icon: HomeIcon }],
  },
  {
    label: 'Ventes',
    items: [
      { id: 'orders', label: 'Commandes', Icon: CartIcon, count: counts.orders },
      { id: 'products', label: 'Produits', Icon: BoxIcon },
      { id: 'sellers', label: 'Vendeurs', Icon: StoreIcon, count: counts.sellers },
      { id: 'buyers', label: 'Acheteurs', Icon: UsersIcon },
      { id: 'whatsappAnalytics', label: 'Contacts WhatsApp', Icon: ChartIcon },
    ],
  },
  {
    label: 'Site',
    items: [
      { id: 'categories', label: 'Catégories', Icon: TagIcon },
      { id: 'pickupPoints', label: 'Points de retrait', Icon: PinIcon },
      ...(user.role === 'super_admin' ? [
        { id: 'homepage', label: 'Page d\'accueil', Icon: LayoutIcon },
        { id: 'about', label: 'Page À propos', Icon: InfoIcon },
        { id: 'shipping', label: 'Frais de livraison', Icon: TruckIcon },
        { id: 'privacy', label: 'Confidentialité', Icon: LockIcon, to: '/admin/privacy-policy' },
      ] : []),
    ],
  },
  {
    label: 'Équipe',
    items: [{ id: 'admins', label: 'Administrateurs', Icon: ShieldIcon, to: '/admin/management' }],
  },
];

const AdminLayout = ({ user, setUser, active, onSelect, title, description, actions, children }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const counts = useAdminPendingCounts(user);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const select = (item) => {
    setMenuOpen(false);
    if (item.to) {
      navigate(item.to);
    } else if (onSelect) {
      onSelect(item.id);
    } else {
      navigate(item.id === 'dashboard' ? '/admin/dashboard' : `/admin/dashboard?section=${item.id}`);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nengoo-user');
    navigate('/');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4">
        <Link to="/admin/dashboard" className="inline-block" onClick={() => setMenuOpen(false)}>
          <img src="/images/logo-nengoo-white.png" alt="Nengoo" className="h-9 w-auto" />
        </Link>
        <p className="mt-1 text-xs text-purple-300">Administration</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Administration">
        {navGroups(user, counts).map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            {group.label && <p className="px-3 mb-1.5 text-xs font-semibold text-purple-300">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => select(item)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full !min-h-0 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        isActive ? 'bg-white text-purple-950 font-bold' : 'text-purple-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <item.Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.count > 0 && (
                        <span className="price min-w-[1.5rem] h-6 px-1.5 rounded-full bg-yellow-300 text-purple-950 text-xs flex items-center justify-center" aria-label={`${item.count} en attente`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
        <p className="px-3 pb-1 text-sm font-semibold text-white truncate">{user.name}</p>
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-purple-100 hover:bg-white/10 hover:text-white">
          <ExternalIcon className="w-5 h-5" />
          Voir le site
        </Link>
        <button type="button" onClick={logout} className="w-full !min-h-0 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left text-purple-100 hover:bg-white/10 hover:text-white">
          <LogoutIcon className="w-5 h-5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-left lg:pl-64">
      {/* Barre latérale (ordinateur) */}
      <aside className="on-dark hidden lg:block fixed inset-y-0 left-0 w-64 bg-purple-950 text-white z-40">
        {sidebar}
      </aside>

      {/* Barre du haut et tiroir (mobile, tablette) */}
      <header className="on-dark lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 bg-purple-950 text-white">
        <Link to="/admin/dashboard">
          <img src="/images/logo-nengoo-white.png" alt="Nengoo, administration" className="h-7 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          className="relative !min-h-0 !min-w-0 w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10"
        >
          <MenuIcon />
          {counts.sellers + counts.orders > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-yellow-300" aria-hidden="true" />
          )}
        </button>
      </header>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu d'administration">
          <div className="absolute inset-0 bg-purple-950/60" onClick={() => setMenuOpen(false)} />
          <aside className="on-dark absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-purple-950 text-white">
            {sidebar}
          </aside>
        </div>
      )}

      <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-[90rem]">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && <h1 className="adm-title">{title}</h1>}
              {description && <p className="adm-subtitle">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
      <AdminFeedbackHost />
    </div>
  );
};

export default AdminLayout;
