
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUnreadNotificationsCount } from '../../lib/notifications';

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
    { path: '/', icon: '🏠', label: 'Accueil' },
    { path: '/catalog', icon: '📚', label: 'Catalogue' },
    { path: '/cart', icon: '🛒', label: 'Panier', count: cartItemCount },
    { path: '/notifications', icon: '🔔', label: 'Notifs', count: unreadCount },
    { path: user ? (user.type === 'seller' ? '/seller' : '/profile') : '/login', icon: '👤', label: 'Profil' }
  ];

  // Adjust width if 5 items
  const itemWidthClass = navItems.length === 5 ? 'w-1/5' : 'w-1/4';

  // Do not show on certain pages
  const hiddenPaths = ['/login', '/seller-signup', '/buyer-signup', '/admin'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-1px_5px_rgba(0,0,0,0.1)] z-50">
      <div className="flex justify-around items-start pt-2 pb-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} className={`flex flex-col items-center justify-center ${itemWidthClass} transition-colors duration-200 ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
              <div className="relative">
                <span className="text-2xl">{item.icon}</span>
                {item.count > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {item.count}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
