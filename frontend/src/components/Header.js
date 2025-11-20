
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from './common';
import { getPublicCategories } from '../services/api';

// Header Component
const Header = ({ language, toggleLanguage, cartItems, searchQuery, setSearchQuery, user, setUser }) => {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [categories, setCategories] = useState([]);
  const t = translations[language];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getPublicCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
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
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-90 transition-opacity">
            <div className="bg-white rounded-lg p-1 sm:p-2">
              <span className="text-lg sm:text-2xl font-bold text-purple-700">🛍️</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Nengoo</h1>
              <p className="text-xs opacity-90 hidden sm:block">nengoo.com</p>
            </div>
          </Link>

          {/* Search Bar - Hidden on mobile, shown on tablet+ */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
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
            </form>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden text-white text-2xl"
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center space-x-4">
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
                  onClick={() => setUser(null)}
                  className="text-sm hover:text-yellow-300 transition-colors"
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

          {/* Mobile User Actions */}
          <div className="flex md:hidden items-center space-x-3">
            <Link to="/cart" className="relative">
              <span className="text-xl">🛒</span>
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-4">
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
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg transition-colors"
            >
              🔍
            </button>
          </form>
        </div>
      </div>

      {/* Categories Navigation - Desktop */}
      {/* <nav className="hidden md:block bg-purple-600 border-t border-purple-500">
        <div className="container mx-auto px-4">
          <div className="flex space-x-6 overflow-x-auto py-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/catalog`}
                state={{ category: cat.name }}
                className="flex items-center space-x-2 hover:text-yellow-300 transition-colors whitespace-nowrap"
              >
                <span className="text-lg">{cat.icon || '📦'}</span>
                <span className="font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav> */}

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-purple-600 border-t border-purple-500">
          <div className="container mx-auto px-4 py-4">
            {/* Mobile Categories */}
            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-yellow-300 text-left">Catégories</h3>
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  to={`/catalog`}
                  state={{ category: cat.name }}
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 py-2 hover:text-yellow-300 transition-colors"
                >
                  <span className="text-xl">{cat.icon || '📦'}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
            
            {/* Mobile User Links */}
            <div className="space-y-3 border-t border-purple-500 pt-4">
              {user ? (
                <div className="space-y-3">
                  <Link
                    to={user.type === 'seller' ? '/seller' : '/profile'}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center space-x-3 py-2 hover:text-yellow-300 transition-colors"
                  >
                    <span className="text-xl">{user.type === 'seller' ? '🏪' : '👤'}</span>
                    <span>{user.name}</span>
                  </Link>
                  <button
                    onClick={() => {
                      setUser(null);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center space-x-3 py-2 hover:text-yellow-300 transition-colors"
                  >
                    <span className="text-xl">🚪</span>
                    <span>{t.logout}</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 py-2 hover:text-yellow-300 transition-colors"
                >
                  <span className="text-xl">👤</span>
                  <span>{t.signin}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
