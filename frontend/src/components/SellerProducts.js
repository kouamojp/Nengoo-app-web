
import React, { useState } from 'react';
import { mockProducts, translations } from './common';
import Header from './Header';
import Footer from './Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';

// Seller Products Management Component
export const SellerProducts = (props) => {
  const { language } = props;
  const [showAddForm, setShowAddForm] = useState(false);
  const [products, setProducts] = useState(mockProducts);
  const [newProduct, setNewProduct] = useState({
    name: { fr: '', en: '' },
    category: 'clothing_accessories',
    price: 0,
    image: '',
    description: { fr: '', en: '' },
    stock: 0,
    inStock: true
  });

  const handleAddProduct = (e) => {
    e.preventDefault();
    const product = {
      ...newProduct,
      id: Math.max(...products.map(p => p.id)) + 1,
      rating: 0,
      reviews: 0
    };
    setProducts([...products, product]);
    setNewProduct({
      name: { fr: '', en: '' },
      category: 'clothing_accessories', 
      price: 0,
      image: '',
      description: { fr: '', en: '' },
      stock: 0,
      inStock: true
    });
    setShowAddForm(false);
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="products" language={language} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <SellerHeader title="Gestion des Produits" language={language} />
            
            {/* Actions Bar */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-bold">Mes Produits ({products.length})</h2>
                  <p className="text-gray-600">Gérez votre catalogue de produits</p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
                >
                  ➕ Ajouter un Produit
                </button>
              </div>
            </div>

            {/* Add Product Form */}
            {showAddForm && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h3 className="text-xl font-bold mb-6">Ajouter un Nouveau Produit</h3>
                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom (Français)</label>
                      <input
                        type="text"
                        required
                        value={newProduct.name.fr}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          name: { ...newProduct.name, fr: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom (Anglais)</label>
                      <input
                        type="text"
                        required
                        value={newProduct.name.en}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          name: { ...newProduct.name, en: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Catégorie</label>
                      <select
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="clothing_accessories">Vêtements et Accessoires</option>
                        <option value="food_drinks">Aliments et Boissons</option>
                        <option value="electronics">Électroniques</option>
                        <option value="home_garden">Maison & Jardinage</option>
                        <option value="handicrafts">Artisanat et Produits Faits Main</option>
                        <option value="beauty_care">Produits de Beauté et Soins Personnels</option>
                        <option value="sports_articles">Articles Sportifs</option>
                        <option value="toys">Jouets pour Enfants</option>
                        <option value="medical_equipment">Matériel Médical</option>
                        <option value="professional_equipment">Équipements Professionnels</option>
                        <option value="services">Services</option>
                        <option value="travel_tickets">Voyages et Billets</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Prix (XAF)</label>
                      <input
                        type="number"
                        required
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Image URL</label>
                      <input
                        type="url"
                        required
                        value={newProduct.image}
                        onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Stock</label>
                      <input
                        type="number"
                        required
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ 
                          ...newProduct, 
                          stock: parseInt(e.target.value),
                          inStock: parseInt(e.target.value) > 0
                        })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description (Français)</label>
                    <textarea
                      required
                      value={newProduct.description.fr}
                      onChange={(e) => setNewProduct({
                        ...newProduct,
                        description: { ...newProduct.description, fr: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description (Anglais)</label>
                    <textarea
                      required
                      value={newProduct.description.en}
                      onChange={(e) => setNewProduct({
                        ...newProduct,
                        description: { ...newProduct.description, en: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
                    >
                      Ajouter le Produit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name[language]}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={() => {}}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg text-sm transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg text-sm transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                    {product.inStock ? (
                      <span className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs rounded">
                        En Stock
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs rounded">
                        Rupture
                      </span>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{product.name[language]}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xl font-bold text-purple-600">
                        {formatPrice(product.price)}
                      </span>
                      <div className="flex items-center">
                        <span className="text-yellow-400 mr-1">⭐</span>
                        <span className="text-sm">{product.rating} ({product.reviews})</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {product.description[language]}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Stock: {product.stock || 'N/A'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {translations[language][product.category]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default SellerProducts;
