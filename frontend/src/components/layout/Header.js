
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import NotificationList from '../ui/NotificationList';
import { getUnreadNotificationsCount } from '../../lib/notifications';
import { SearchIcon, CartIcon, UserIcon, BellIcon, StoreIcon, LogoutIcon } from '../ui/Icons';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const formatPrice = (price) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
  minimumFractionDigits: 0,
}).format(price);

const CountBadge = ({ count }) => (
  count > 0 ? (
    <span className="absolute -top-1.5 -right-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-yellow-300 text-purple-950 text-[0.7rem] font-bold flex items-center justify-center ring-2 ring-purple-800">
      {count > 99 ? '99+' : count}
    </span>
  ) : null
);

const actionClass = 'relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-purple-100 hover:text-white hover:bg-white/10 transition-colors';

const Header = ({ language, cartItems, searchQuery, setSearchQuery, user, setUser }) => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const t = translations[language];
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // Only fetch notifications for buyers and sellers, not admins
    if (user && (user.type === 'buyer' || user.type === 'seller')) {
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
    <header className="on-dark text-left bg-purple-800 text-white sticky top-0 z-50 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="container mx-auto px-4 py-2.5 md:py-3">
        <div className="flex items-center gap-3 md:gap-8">
          <Link to="/" className="shrink-0 rounded-md" aria-label="Nengoo, accueil">
            <img
              src="/images/logo-nengoo-white.png"
              alt="Nengoo"
              className="h-8 md:h-11 w-auto"
            />
          </Link>

          {/* Recherche */}
          <div className="flex-1 max-w-2xl search-container">
            <form onSubmit={handleSearch} className="relative w-full" role="search">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                className="w-full h-11 pl-4 pr-12 text-gray-900 placeholder:text-gray-500 bg-white !rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
              <button
                type="submit"
                aria-label={t.search}
                className="absolute right-1 top-1/2 -translate-y-1/2 !min-h-0 !min-w-0 w-9 h-9 rounded-full bg-purple-700 hover:bg-purple-900 text-white flex items-center justify-center transition-colors"
              >
                <SearchIcon className="w-5 h-5" strokeWidth={2.2} />
              </button>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl z-10 max-h-96 overflow-y-auto py-1">
                  {suggestions.map(product => (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug || product.id}`}
                      className="flex items-center gap-3 px-3 py-2 text-gray-900 hover:bg-purple-50"
                      onClick={() => {
                        setShowSuggestions(false);
                        setSearchQuery('');
                      }}
                    >
                      <img src={product.images[0]} alt="" className="w-11 h-11 rounded-md object-cover bg-gray-100 shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{product.name}</span>
                      <span className="price text-purple-800 shrink-0">
                        {formatPrice(product.promoPrice > 0 ? product.promoPrice : product.price)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Actions (ordinateur) — sur mobile, la barre du bas prend le relais */}
          <nav className="hidden md:flex items-center gap-1 text-xs ml-auto">
            {user && (user.type === 'buyer' || user.type === 'seller') && (
              <div className="relative notifications-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={actionClass}
                  aria-expanded={showNotifications}
                >
                  <span className="relative">
                    <BellIcon />
                    <CountBadge count={unreadCount} />
                  </span>
                  <span>Notifs</span>
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

            <Link to="/cart" className={actionClass}>
              <span className="relative">
                <CartIcon />
                <CountBadge count={cartCount} />
              </span>
              <span>{t.cart}</span>
            </Link>

            {user ? (
              <>
                <Link to={user.type === 'seller' ? '/seller' : '/profile'} className={actionClass}>
                  {user.type === 'seller' ? <StoreIcon /> : <UserIcon />}
                  <span className="max-w-[7rem] truncate">{user.name}</span>
                </Link>
                <button
                  onClick={() => {
                    setUser(null);
                    localStorage.removeItem('nengoo-user');
                    navigate('/'); // Redirect to home page
                  }}
                  className={actionClass}
                >
                  <LogoutIcon />
                  <span>{t.logout}</span>
                </button>
              </>
            ) : (
              <Link to="/login" className={actionClass}>
                <UserIcon />
                <span>{t.signin}</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
