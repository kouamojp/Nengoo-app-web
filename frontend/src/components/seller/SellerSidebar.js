import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HomeIcon, BoxIcon, CartIcon, ChartIcon, BellIcon, StoreIcon,
  LogoutIcon, MenuIcon, ExternalIcon,
} from '../ui/Icons';

// Sections de l'espace vendeur ; chacune a sa propre URL (lien direct, retour arrière)
export const SELLER_SECTIONS = [
  { id: 'dashboard', label: 'Vue d\'ensemble', path: '/seller', Icon: HomeIcon },
  { id: 'orders', label: 'Commandes', path: '/seller/orders', Icon: CartIcon },
  { id: 'products', label: 'Produits', path: '/seller/products', Icon: BoxIcon },
  { id: 'analytics', label: 'Statistiques', path: '/seller/analytics', Icon: ChartIcon },
  { id: 'messages', label: 'Messages', path: '/seller/messages', Icon: BellIcon },
  { id: 'profile', label: 'Boutique et livraison', path: '/seller/profile', Icon: StoreIcon },
];

const Avatar = ({ user }) => {
  const name = user?.businessName || 'Vendeur';
  if (user?.logoUrl) {
    return <img src={user.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-white" />;
  }
  return (
    <span className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center font-display text-xl" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
};

/**
 * Coque de l'espace vendeur : même structure que l'administration
 * (barre latérale sombre sur ordinateur, tiroir sur mobile).
 */
const SellerSidebar = ({ user, setUser, active, pendingOrders = 0, children }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nengoo-user');
    navigate('/');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4">
        <Link to="/seller" onClick={() => setMenuOpen(false)} className="inline-block">
          <img src="/images/logo-nengoo-white.png" alt="Nengoo" className="h-9 w-auto" />
        </Link>
        <p className="mt-1 text-xs text-purple-300">Espace vendeur</p>
      </div>

      <div className="mx-3 mb-4 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{user?.businessName}</p>
          <Link to={`/seller/${user?.id}`} className="text-xs text-purple-200 hover:text-white underline underline-offset-2">
            Voir ma boutique
          </Link>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Espace vendeur">
        <ul className="space-y-0.5">
          {SELLER_SECTIONS.map(item => {
            const isActive = active === item.id;
            const count = item.id === 'orders' ? pendingOrders : 0;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-white text-purple-950 font-bold' : 'text-purple-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="price min-w-[1.5rem] h-6 px-1.5 rounded-full bg-yellow-300 text-purple-950 text-xs flex items-center justify-center" aria-label={`${count} à confirmer`}>
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-purple-100 hover:bg-white/10 hover:text-white">
          <ExternalIcon className="w-5 h-5" />
          Retour au site
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
      <aside className="on-dark hidden lg:block fixed inset-y-0 left-0 w-64 bg-purple-950 text-white z-40">
        {sidebar}
      </aside>

      <header className="on-dark lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 bg-purple-950 text-white">
        <Link to="/seller">
          <img src="/images/logo-nengoo-white.png" alt="Nengoo, espace vendeur" className="h-7 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          className="relative !min-h-0 !min-w-0 w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10"
        >
          <MenuIcon />
          {pendingOrders > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-yellow-300" aria-hidden="true" />
          )}
        </button>
      </header>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu de l'espace vendeur">
          <button type="button" className="absolute inset-0 w-full bg-purple-950/60" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" />
          <aside className="on-dark absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-purple-950 text-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10 max-w-6xl">
        {children}
      </main>
    </div>
  );
};

export default SellerSidebar;
