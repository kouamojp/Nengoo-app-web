import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import Toast from './components/ui/Toast';
import {
  Homepage,
  ProductCatalog,
  ProductDetail,
  ShoppingCart,
  Checkout,
  UserProfile,
  About,
  SearchResults,
  SellerDashboard,
  SellerProducts,
  SellerOrders,
  SellerAnalytics,
  SellerProfile,
  SellerMessages,
  Login,
  BuyerSignup,
  SellerSignup,
  PendingApproval,
  AdminLogin,
  AdminDashboard,
  AdminManagement,
  PickupPointsMap
} from './components';

function App() {
  const [language, setLanguage] = useState('fr');
  const [currency, setCurrency] = useState('XAF');
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('nengoo-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          return parsedCart;
        }
        return [];
      } catch (e) {
        console.error('[NengooCartDebug] App.js: Error parsing saved cart from localStorage:', e);
        return [];
      }
    }
    return [];
  });
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ message: '', type: '', show: false });

  const showToast = (message, type = 'success') => {
    setToast({ message, type, show: true });
  };

  const hideToast = () => {
    setToast({ message: '', type: '', show: false });
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('nengoo-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Save cart to localStorage when cartItems change
  useEffect(() => {
    console.log('[NengooCartDebug] App.js: Cart items changed, saving to localStorage:', JSON.stringify(cartItems, null, 2));
    localStorage.setItem('nengoo-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      let newCart;
      if (existingItem) {
        newCart = prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newCart = [...prev, { ...product, quantity }];
      }
      console.log('[NengooCartDebug] App.js: addToCart - New cart state:', newCart);
      return newCart;
    });
    showToast(`${product.name[language]} ajouté au panier!`, 'success');
  };

  const updateCartQuantity = (productId, newQuantity) => {
    setCartItems(prev => {
      let newCart;
      if (newQuantity <= 0) {
        newCart = prev.filter(item => item.id !== productId);
      } else {
        newCart = prev.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        );
      }
      console.log('[NengooCartDebug] App.js: updateCartQuantity - New cart state:', newCart);
      return newCart;
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => {
      const newCart = prev.filter(item => item.id !== productId);
      console.log('[NengooCartDebug] App.js: removeFromCart - New cart state:', newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    console.log('[NengooCartDebug] App.js: clearCart - Cart cleared.');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'fr' ? 'en' : 'fr');
  };

  const updateUser = (userData) => {
    console.log('App.js updateUser:', userData);
    setUser(userData);
    if (userData) {
      localStorage.setItem('nengoo-user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('nengoo-user');
    }
  };

  const appProps = {
    language,
    currency,
    cartItems,
    user,
    searchQuery,
    setSearchQuery,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleLanguage,
    setUser: updateUser
  };

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Homepage {...appProps} />} />
          <Route path="/catalog" element={<ProductCatalog {...appProps} />} />
          <Route path="/catalog/:category" element={<ProductCatalog {...appProps} />} />
          <Route path="/product/:id" element={<ProductDetail {...appProps} />} />
          <Route path="/cart" element={<ShoppingCart {...appProps} />} />
          <Route path="/checkout" element={<Checkout {...appProps} />} />
          <Route path="/profile" element={<UserProfile {...appProps} />} />
          <Route path="/about" element={<About {...appProps} />} />
          <Route path="/search" element={<SearchResults {...appProps} />} />
          <Route path="/pickup-points" element={<PickupPointsMap {...appProps} />} />
          
          {/* Authentication Routes */}
          <Route path="/login" element={<Login {...appProps} />} />
          <Route path="/signup/buyer" element={<BuyerSignup {...appProps} />} />
          <Route path="/signup/seller" element={<SellerSignup {...appProps} />} />
          <Route path="/pending-approval" element={<PendingApproval {...appProps} />} />
          
          {/* Seller Routes */}
          <Route path="/seller" element={<SellerDashboard {...appProps} />} />
          <Route path="/seller/products" element={<SellerProducts {...appProps} />} />
          <Route path="/seller/orders" element={<SellerOrders {...appProps} />} />
          <Route path="/seller/analytics" element={<SellerAnalytics {...appProps} />} />
          <Route path="/seller/profile" element={<SellerProfile {...appProps} />} />
          <Route path="/seller/messages" element={<SellerMessages {...appProps} />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin {...appProps} />} />
          <Route path="/admin/dashboard" element={<AdminDashboard {...appProps} />} />
          <Route path="/admin/management" element={<AdminManagement {...appProps} />} />
        </Routes>
      </Router>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}

export default App;