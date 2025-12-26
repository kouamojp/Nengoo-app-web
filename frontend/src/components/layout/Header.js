
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import InstallButton from '../pwa/InstallButton';
import NotificationList from '../ui/NotificationList';
import { getUnreadNotificationsCount } from '../../lib/notifications';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const Header = ({ language, toggleLanguage, cartItems, searchQuery, setSearchQuery, user, setUser }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const t = translations[language];

  // Mapping des icônes pour les catégories
  const categoryIcons = {
    'Vêtements et Accessoires': '👗',
    'Aliments et Boissons': '🍽️',
    'Électroniques': '📱',
    'Maison & Jardinage': '🏠',
    'Artisanat': '🎨',
    'Beauté et Soins': '💄',
    'Articles Sportifs': '⚽',
    'Jouets pour Enfants': '🧸',
    'Matériel Médical': '🏥',
    'Équipements Pro': '🔧',
    'Services': '🛠️',
    'Voyages et Billets': '✈️'
  };

  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        const count = await getUnreadNotificationsCount(user.id, user.type);
        setUnreadCount(count);
      };
      fetchUnreadCount();
      
      // Poll every minute
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("❌ [Header] Erreur lors de la récupération des catégories:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const response = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(searchQuery.trim())}`);
          if (response.ok) {
            const data = await response.json();
            setSuggestions(data);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des suggestions:", error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSuggestions && !event.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-gradient-to-r from-purple-700 to-red-600 text-white shadow-lg sticky top-0 z-50">
      {/* Top Bar */}
      {/* <div className="bg-purple-800 py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex space-x-4">
            <span className="hidden sm:inline">📍 Cameroun</span>
            <span className="hidden md:inline">📞 +237 6XX XXX XXX</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button onClick={toggleLanguage} className="hover:text-yellow-300 transition-colors text-xs sm:text-sm">
              {language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
            </button>
            <span className="text-xs sm:text-sm">💰 XAF</span>
          </div>
        </div>
      </div> */}

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="max-md:hidden flex items-center space-x-2 sm:space-x-3 hover:opacity-90 transition-opacity">
            <img 
              src="/images/logo-nengoo.png" 
              alt="Nengoo Logo" 
              className="h-10 sm:h-12 w-auto"
            />
          </Link>

          {/* Search Bar - Hidden on mobile, shown on tablet+ */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8 search-container">
            <form onSubmit={handleSearch} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full px-4 py-3 text-black rounded-lg border-2 border-white focus:border-yellow-300 focus:outline-none"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🔍
              </button>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                  {suggestions.map(product => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="flex items-center px-4 py-2 text-black hover:bg-gray-100"
                      onClick={() => {
                        setShowSuggestions(false);
                        setSearchQuery('');
                      }}
                    >
                      <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover mr-4"/>
                      <span>{product.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-end space-x-4">
            {/* <InstallButton /> */}
            
            {user && (
              <div className="relative notifications-container">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative hover:text-yellow-300 transition-colors flex flex-col items-center"
                >
                  <span className="text-2xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {unreadCount}
                    </span>
                  )}
                  <div className="text-sm">Notifs</div>
                </button>
                {showNotifications && (
                  <NotificationList 
                    userId={user.id} 
                    userType={user.type} 
                    onClose={() => setShowNotifications(false)}
                  />
                )}
              </div>
            )}

            <Link to="/cart" className="relative hover:text-yellow-300 transition-colors">
              <span className="text-2xl">🛒</span>
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
              <div className="text-sm">{t.cart}</div>
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to={user.type === 'seller' ? '/seller' : '/profile'} className="hover:text-yellow-300 transition-colors">
                  <span className="text-2xl">{user.type === 'seller' ? '🏪' : '👤'}</span>
                  <div className="text-sm">{user.name}</div>
                </Link>
                <button
                  onClick={() => {
                    setUser(null);
                    localStorage.removeItem('nengoo-user');
                    navigate('/'); // Redirect to home page
                  }}
                  className="text-sm hover:text-yellow-300 transition-colors flex items-end mt-2"
                >
                  {t.logout}
                </button>
              </div>
            ) : (
              <Link to="/login" className="hover:text-yellow-300 transition-colors">
                <span className="text-2xl">👤</span>
                <div className="text-sm">{t.signin}</div>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-4 search-container">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="w-full px-4 py-2 text-black rounded-lg border-2 border-white focus:border-yellow-300 focus:outline-none"
            />
            <button 
              type="submit"
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg transition-colors"
            >
              🔍
            </button>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                {suggestions.map(product => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="flex items-center px-4 py-2 text-black hover:bg-gray-100"
                    onClick={() => {
                      setShowSuggestions(false);
                      setSearchQuery('');
                    }}
                  >
                    <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover mr-4"/>
                    <span>{product.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Categories Navigation - Desktop */}
     {/*  {<nav className="hidden md:block bg-purple-600 border-t border-purple-500">
        <div className="container mx-auto px-4">
          <div className="flex space-x-6 overflow-x-auto py-3">
            {categories.map(cat => (
              <Link
                key={cat.key}
                to={`/catalog/${cat.key}`}
                className="flex items-center space-x-2 hover:text-yellow-300 transition-colors whitespace-nowrap"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="font-medium">{t[cat.key]}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>} */}
    </header>
  );
};

export default Header;
