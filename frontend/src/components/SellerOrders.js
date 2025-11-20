
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import { getSellerOrders, deleteSellerOrder } from '../services/api';

// Seller Orders Management Component
export const SellerOrders = (props) => {
  const { language } = props;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const ordersData = await getSellerOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    console.log('handleDeleteOrder called with orderId:', orderId);
    console.log('Current deleteConfirm state:', deleteConfirm);

    if (deleteConfirm !== orderId) {
      console.log('First click - arming delete confirmation');
      setDeleteConfirm(orderId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    console.log('Second click - executing delete');
    try {
      console.log('Calling deleteSellerOrder API with orderId:', orderId);
      await deleteSellerOrder(orderId);
      console.log('Delete successful, updating orders list');
      setOrders(orders.filter(o => o.id !== orderId));
      setDeleteConfirm(null);
      alert('Commande supprimée avec succès');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(error.message || 'Erreur lors de la suppression de la commande');
    }
  };

  // Filter by status
  const statusFilteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(order => order.status === filterStatus);

  // Filter by search term
  const filteredOrders = statusFilteredOrders.filter(order => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const orderId = order.id.toLowerCase();
    const buyerName = (order.buyerName || '').toLowerCase();
    const products = order.items ? order.items.map(item => item.productName.toLowerCase()).join(' ') : '';

    return orderId.includes(searchLower) ||
           buyerName.includes(searchLower) ||
           products.includes(searchLower);
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'shipped': return '🚚';
      case 'delivered': return '📦';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'shipped': return 'Expédiée';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="orders" language={language} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <SellerHeader title="Gestion des Commandes" language={language} />

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Rechercher par n° commande, client ou produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Filters and Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-bold">Mes Commandes ({filteredOrders.length})</h2>
                  <p className="text-gray-600">Commandes contenant vos produits</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === status
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {status === 'all' ? 'Toutes' : getStatusText(status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Chargement des commandes...</p>
              </div>
            ) : (
              <>
                {/* Orders List */}
                <div className="space-y-6">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-lg shadow-lg p-6">
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                        <div>
                          <div className="flex items-center space-x-4">
                            <h3 className="text-lg font-bold">Commande #{order.id.slice(-6)}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)} {getStatusText(order.status)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 mt-2">
                            <span>👤 {order.buyerName || 'Client'}</span>
                            <span>📅 {new Date(order.createdDate).toLocaleDateString('fr-FR')}</span>
                            <span className="font-semibold text-purple-600">
                              {formatPrice(order.sellerTotal || 0)} (Vos produits)
                            </span>
                          </div>
                          {order.buyerWhatsapp && (
                            <div className="mt-2">
                              <a
                                href={`https://wa.me/${order.buyerWhatsapp.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-green-600 hover:text-green-700 font-medium"
                              >
                                📱 Contacter le client
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            onClick={() => alert('Détails de la commande (à implémenter)')}
                          >
                            Détails
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              deleteConfirm === order.id
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {deleteConfirm === order.id ? '🗑️ Confirmer ?' : '🗑️ Supprimer'}
                          </button>
                        </div>
                      </div>

                      {/* Order Items - Only seller's products */}
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Vos produits dans cette commande:</h4>
                        <div className="space-y-2">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, index) => (
                              <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <span className="font-medium">{item.productName}</span>
                                  <div className="text-sm text-gray-600">
                                    <span>Quantité: {item.quantity}</span>
                                    <span className="ml-4">Prix unitaire: {formatPrice(item.price)}</span>
                                  </div>
                                </div>
                                <span className="font-semibold text-purple-600">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">Aucun produit</p>
                          )}
                        </div>

                        {/* Delivery Info */}
                        {order.deliveryAddress && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h5 className="font-semibold mb-2">📍 Adresse de livraison:</h5>
                            <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                            {order.deliveryCity && (
                              <p className="text-sm text-gray-700 mt-1">Ville: {order.deliveryCity}</p>
                            )}
                            {order.deliveryPhone && (
                              <p className="text-sm text-gray-700 mt-1">Téléphone: {order.deliveryPhone}</p>
                            )}
                          </div>
                        )}

                        {/* Order Total for this seller */}
                        <div className="mt-4 flex justify-end">
                          <div className="bg-purple-50 px-4 py-2 rounded-lg">
                            <span className="text-sm text-gray-600">Total de vos produits: </span>
                            <span className="text-lg font-bold text-purple-600">
                              {formatPrice(order.sellerTotal || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredOrders.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold mb-2">Aucune commande trouvée</h3>
                    <p className="text-gray-600">
                      {searchTerm ? (
                        `Aucun résultat pour "${searchTerm}"`
                      ) : filterStatus === 'all' ? (
                        "Vous n'avez pas encore de commandes contenant vos produits."
                      ) : (
                        `Aucune commande avec le statut "${getStatusText(filterStatus)}".`
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer language={language} />
    </div>
  );
};

export default SellerOrders;
