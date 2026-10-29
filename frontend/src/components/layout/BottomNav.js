
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUnreadNotificationsCount } from '../../lib/notifications';
import { HomeIcon, GridIcon, CartIcon, BellIcon, UserIcon } from '../ui/Icons';

const BottomNav = ({ cartItemCount, user }) => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        const count = await getUnreadNotificationsCount(user.id, user.type);
        setUnreadCount(count);
      };
      fetchUnreadCount();

      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const navItems = [
    { path: '/', Icon: HomeIcon, label: 'Accueil' },
    { path: '/catalog', Icon: GridIcon, label: 'Catalogue' },
    { path: '/cart', Icon: CartIcon, label: 'Panier', count: cartItemCount },
    { path: '/notifications', Icon: BellIcon, label: 'Notifs', count: unreadCount },
    { path: user ? (user.type === 'seller' ? '/seller' : '/profile') : '/login', Icon: UserIcon, label: 'Profil' }
  ];

  // Do not show on certain pages
  const hiddenPaths = ['/login', '/seller-signup', '/buyer-signup', '/admin'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
      <div className="grid grid-cols-5">
        {navItems.map(({ path, Icon, label, count }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={label}
              to={path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 pt-1.5 pb-2 text-[0.7rem] ${isActive ? 'text-purple-800 font-semibold' : 'text-gray-500'}`}
            >
              <span className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-colors ${isActive ? 'bg-purple-100' : ''}`}>
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.2 : 1.8} />
                {count > 0 && (
                  <span className="absolute top-0 right-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[0.65rem] font-bold flex items-center justify-center ring-2 ring-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
