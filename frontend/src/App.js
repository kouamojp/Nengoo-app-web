import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import './App.css';
import ScrollToTop from './components/ui/ScrollToTop';
import Toast from './components/ui/Toast';
import Homepage from './components/pages/Homepage';
import ProductCatalog from './components/pages/ProductCatalog';
import ProductDetail from './components/pages/ProductDetail';
import ShoppingCart from './components/cart/ShoppingCart';
import Checkout from './components/cart/Checkout';
import UserProfile from './components/pages/UserProfile';
import About from './components/pages/About';
import SearchResults from './components/pages/SearchResults';
import SellerShop from './components/pages/SellerShop';
import NotificationsPage from './components/pages/NotificationsPage';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import BottomNav from './components/layout/BottomNav';
import AssistantWidget from './components/assistant/AssistantWidget';

// Chargés à la demande : la plupart des visiteurs n'ouvrent jamais l'espace
// vendeur ou admin, et la connexion embarque Firebase (lourd)
const SellerDashboard = lazy(() => import('./components/seller/SellerDashboard'));
const Login = lazy(() => import('./components/auth/Login'));
const Signup = lazy(() => import('./components/auth/Signup'));
const PendingApproval = lazy(() => import('./components/auth/PendingApproval'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'));
const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminManagement = lazy(() => import('./components/admin/AdminManagement'));
const SellerProductList = lazy(() => import('./components/admin/SellerProductList'));
const PrivacyPolicyEditor = lazy(() => import('./components/admin/PrivacyPolicyEditor'));
const BuyerVerification = lazy(() => import('./components/admin/BuyerVerification'));
const PickupPointsMap = lazy(() => import('./components/pages/PickupPointsMap'));
const DeleteAccount = lazy(() => import('./components/pages/DeleteAccount'));
const TrackOrder = lazy(() => import('./components/pages/TrackOrder'));
const CourierPage = lazy(() => import('./components/pages/CourierPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Chargement">
    <span className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-700 animate-spin" />
  </div>
);

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
    localStorage.setItem('nengoo-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    // Un service se réserve auprès du vendeur (WhatsApp), pas par le panier
    if (product?.kind === 'service') return;
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
      return newCart;
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => {
      const newCart = prev.filter(item => item.id !== productId);
      return newCart;
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'fr' ? 'en' : 'fr');
  };

  const updateUser = (incoming) => {
    // Une mise à jour de profil renvoie le compte sans jeton : on garde celui de la session
    const userData = incoming && !incoming.accessToken && user?.accessToken && user.id === incoming.id
      ? { ...incoming, accessToken: user.accessToken }
      : incoming;
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

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    
      <div className="App">
        <Router>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Homepage {...appProps} />} />
            <Route path="/catalog" element={<ProductCatalog {...appProps} />} />
            <Route path="/catalog/:category" element={<ProductCatalog {...appProps} />} />
            <Route path="/product/:idOrSlug" element={<ProductDetail {...appProps} />} />
            <Route path="/cart" element={<ShoppingCart {...appProps} />} />
            <Route path="/checkout" element={<Checkout {...appProps} />} />
            <Route path="/profile" element={<UserProfile {...appProps} />} />
            <Route path="/notifications" element={<NotificationsPage {...appProps} />} />
            <Route path="/about" element={<About {...appProps} />} />
            <Route path="/search" element={<SearchResults {...appProps} />} />
            <Route path="/pickup-points" element={<PickupPointsMap {...appProps} />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy {...appProps} />} />
            <Route path="/delete-account" element={<DeleteAccount {...appProps} />} />
            <Route path="/suivi-commande" element={<TrackOrder {...appProps} />} />
            <Route path="/track-order" element={<TrackOrder {...appProps} />} />
            <Route path="/livreur/:token" element={<CourierPage />} />

            {/* Authentication Routes */}
            <Route path="/login/:accountType?" element={<Login {...appProps} />} />
            <Route path="/signup/:accountType?" element={<Signup {...appProps} />} />
            <Route path="/forgot-password" element={<ForgotPassword {...appProps} />} />
            <Route path="/reset-password" element={<ResetPassword {...appProps} />} />
            <Route path="/pending-approval" element={<PendingApproval {...appProps} />} />
            
            {/* Public Seller Shop Route */}
            <Route path="/seller/:id" element={<SellerShop {...appProps} />} />

            {/* Seller Routes */}
            {/* Chaque section de l'espace vendeur a son URL, dans la même coque */}
            <Route path="/seller" element={<SellerDashboard {...appProps} />} />
            {['products', 'orders', 'analytics', 'profile', 'messages', 'support'].map(section => (
              <Route key={section} path={`/seller/${section}`} element={<SellerDashboard {...appProps} section={section} />} />
            ))}
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin {...appProps} />} />
            <Route path="/admin/dashboard" element={<AdminDashboard {...appProps} />} />
            <Route path="/admin/management" element={<AdminManagement {...appProps} />} />
            <Route path="/admin/privacy-policy" element={<PrivacyPolicyEditor {...appProps} />} />
            <Route path="/verify-buyer/:buyerId" element={<BuyerVerification {...appProps} />} />
            <Route path="/admin/seller-products/:sellerId" element={<SellerProductList {...appProps} />} />
            {/* Catch-all route for unmatched paths */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          <AssistantWidget language={language} />
          <BottomNav cartItemCount={cartItemCount} user={user} />
        </Router>
        {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      </div>
   
  );
}

export default App;