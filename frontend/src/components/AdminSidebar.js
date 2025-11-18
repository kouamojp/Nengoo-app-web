import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export const AdminSidebar = ({ setUser }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      path: '/admin/dashboard',
      icon: '📊',
      label: 'Tableau de bord',
      key: 'dashboard'
    },
    {
      path: '/admin/buyers',
      icon: '👥',
      label: 'Clients',
      key: 'buyers'
    },
    {
      path: '/admin/sellers',
      icon: '🏪',
      label: 'Vendeurs',
      key: 'sellers'
    },
    {
      path: '/admin/products',
      icon: '📦',
      label: 'Produits',
      key: 'products'
    },
    {
      path: '/admin/categories',
      icon: '🏷️',
      label: 'Catégories',
      key: 'categories'
    },
    {
      path: '/admin/orders',
      icon: '🛒',
      label: 'Commandes',
      key: 'orders'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('nengoo-user');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold">Nengoo Admin</h2>
        <p className="text-sm text-gray-400 mt-1">Panneau d'administration</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.key}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-2xl mr-3">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          <span className="text-xl mr-2">🚪</span>
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
