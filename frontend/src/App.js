
import React, { useState, useEffect } from 'react';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './App.css';

import Homepage from './components/Homepage';

import ProductCatalog from './components/ProductCatalog';

import ProductDetail from './components/ProductDetail';

import ShoppingCart from './components/ShoppingCart';

import Checkout from './components/Checkout';

import UserProfile from './components/UserProfile';

import About from './components/About';

import SearchResults from './components/SearchResults';

import SellerDashboard from './components/SellerDashboard';

import SellerProducts from './components/SellerProducts';

import SellerOrders from './components/SellerOrders';

import SellerAnalytics from './components/SellerAnalytics';

import SellerProfile from './components/SellerProfile';

import SellerMessages from './components/SellerMessages';

import Login from './components/Login';

import BuyerLogin from './components/BuyerLogin';

import SellerLogin from './components/SellerLogin';

import BuyerSignup from './components/BuyerSignup';

import SellerSignup from './components/SellerSignup';

import PendingApproval from './components/PendingApproval';

import AdminLogin from './components/AdminLogin';

import AdminDashboard from './components/AdminDashboard';

import AdminBuyers from './components/AdminBuyers';

import AdminSellers from './components/AdminSellers';

import AdminProducts from './components/AdminProducts';

import AdminCategories from './components/AdminCategories';

import AdminOrders from './components/AdminOrders';

import CartNotification from './components/CartNotification';

import ScrollToTop from './components/ScrollToTop';



function App() {

  const [language, setLanguage] = useState('fr');

  const [currency, setCurrency] = useState('XAF');



  // Initialiser cartItems directement depuis localStorage

  const [cartItems, setCartItems] = useState(() => {

    const savedCart = localStorage.getItem('nengoo-cart');

    return savedCart ? JSON.parse(savedCart) : [];

  });



  const [user, setUser] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [showNotification, setShowNotification] = useState(false);

  const [notificationProduct, setNotificationProduct] = useState(null);



  // Load user from localStorage on mount

  useEffect(() => {

    const savedUser = localStorage.getItem('nengoo-user');

    if (savedUser) {

      setUser(JSON.parse(savedUser));

    }

  }, []);



  // Save cart to localStorage when cartItems change

  useEffect(() => {

    localStorage.setItem('nengoo-cart', JSON.stringify(cartItems));

  }, [cartItems]);



  const addToCart = (product, quantity = 1) => {

    setCartItems(prev => {

      const existingItem = prev.find(item => item.id === product.id);

      if (existingItem) {

        return prev.map(item =>

          item.id === product.id

            ? { ...item, quantity: item.quantity + quantity }

            : item

        );

      }

      return [...prev, { ...product, quantity }];

    });



    // Afficher la notification

    setNotificationProduct(product);

    setShowNotification(true);

  };



  const updateCartQuantity = (productId, newQuantity) => {

    if (newQuantity <= 0) {

      setCartItems(prev => prev.filter(item => item.id !== productId));

    } else {

      setCartItems(prev =>

        prev.map(item =>

          item.id === productId ? { ...item, quantity: newQuantity } : item

        )

      );

    }

  };



  const removeFromCart = (productId) => {

    setCartItems(prev => prev.filter(item => item.id !== productId));

  };



  const clearCart = () => {

    setCartItems([]);

  };



  const toggleLanguage = () => {

    setLanguage(prev => prev === 'fr' ? 'en' : 'fr');

  };



  const updateUser = (userData) => {

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

        <ScrollToTop />

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



          {/* Authentication Routes */}

          <Route path="/login" element={<Login {...appProps} />} />

          <Route path="/login/buyer" element={<BuyerLogin {...appProps} />} />

          <Route path="/login/seller" element={<SellerLogin {...appProps} />} />

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

          <Route path="/admin" element={<AdminDashboard {...appProps} />} />

          <Route path="/admin/dashboard" element={<AdminDashboard {...appProps} />} />

          <Route path="/admin/buyers" element={<AdminBuyers {...appProps} />} />

          <Route path="/admin/sellers" element={<AdminSellers {...appProps} />} />

          <Route path="/admin/products" element={<AdminProducts {...appProps} />} />

          <Route path="/admin/categories" element={<AdminCategories {...appProps} />} />

          <Route path="/admin/orders" element={<AdminOrders {...appProps} />} />

        </Routes>



        {/* Cart Notification */}

        <CartNotification

          show={showNotification}

          product={notificationProduct}

          onClose={() => setShowNotification(false)}

        />

      </Router>

    </div>

  );

}



export default App;
