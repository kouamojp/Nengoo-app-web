
import React, { useState, useEffect } from 'react';
import { translations } from './common';
import Header from './Header';
import Footer from './Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import {
  getSellerOwnProducts,
  createProductBySeller,
  updateSellerProduct,
  deleteSellerProduct,
  getPublicCategories,
  uploadProductImage
} from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

// Seller Products Management Component
export const SellerProducts = (props) => {
  const { language } = props;
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    price: 0,
    images: [],
    description: '',
    stock: 0,
    unit: 'unité'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getSellerOwnProducts(),
        getPublicCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);

      // Set default category if available
      if (categoriesData.length > 0 && !newProduct.category) {
        setNewProduct(prev => ({ ...prev, category: categoriesData[0].name }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, isEditing = false) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    const currentImages = isEditing ? editingProduct.images : newProduct.images;

    // Limit to 5 images total
    if (currentImages.length + files.length > 5) {
      alert('Vous ne pouvez ajouter que 5 images maximum');
      return;
    }

    setUploadingImage(true);

    try {
      const uploadPromises = files.map(file => uploadProductImage(file));
      const uploadedImages = await Promise.all(uploadPromises);

      const imageUrls = uploadedImages.map(img => img.url);

      if (isEditing) {
        setEditingProduct(prev => ({
          ...prev,
          images: [...prev.images, ...imageUrls]
        }));
      } else {
        setNewProduct(prev => ({
          ...prev,
          images: [...prev.images, ...imageUrls]
        }));
      }

      alert(`${files.length} image(s) uploadée(s) avec succès`);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert(error.message || 'Erreur lors de l\'upload des images');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleRemoveImage = (indexToRemove, isEditing = false) => {
    if (isEditing) {
      setEditingProduct(prev => ({
        ...prev,
        images: prev.images.filter((_, index) => index !== indexToRemove)
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        images: prev.images.filter((_, index) => index !== indexToRemove)
      }));
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProductBySeller({
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock)
      });

      alert('Produit ajouté avec succès!');
      setNewProduct({
        name: '',
        category: categories.length > 0 ? categories[0].name : '',
        price: 0,
        images: [],
        description: '',
        stock: 0,
        unit: 'unité'
      });
      setShowAddForm(false);
      await loadData(); // Reload products
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error.message || 'Erreur lors de l\'ajout du produit');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSellerProduct(editingProduct.id, {
        ...editingProduct,
        price: parseFloat(editingProduct.price),
        stock: parseInt(editingProduct.stock)
      });

      alert('Produit modifié avec succès!');
      setEditingProduct(null);
      setShowEditForm(false);
      await loadData(); // Reload products
    } catch (error) {
      console.error('Error updating product:', error);
      alert(error.message || 'Erreur lors de la modification du produit');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
      try {
        await deleteSellerProduct(id);
        alert('Produit supprimé avec succès!');
        await loadData(); // Reload products
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(error.message || 'Erreur lors de la suppression du produit');
      }
    }
  };

  const openEditForm = (product) => {
    setEditingProduct({ ...product });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryName = (categoryName) => {
    // Category is already stored as name in the product
    const category = categories.find(c => c.name === categoryName);
    return category ? `${category.icon} ${category.name}` : categoryName;
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
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setShowEditForm(false);
                  }}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
                >
                  ➕ Ajouter un Produit
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Chargement des produits...</p>
              </div>
            ) : (
              <>
                {/* Add Product Form */}
                {showAddForm && (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h3 className="text-xl font-bold mb-6">Ajouter un Nouveau Produit</h3>
                    <form onSubmit={handleAddProduct} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">Nom du Produit</label>
                          <input
                            type="text"
                            required
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Catégorie</label>
                          <select
                            value={newProduct.category}
                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          >
                            <option value="">Sélectionnez une catégorie</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.icon} {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Prix (XAF)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Stock</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Unité</label>
                          <input
                            type="text"
                            value={newProduct.unit}
                            onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Ex: unité, kg, litre..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          required
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Décrivez votre produit..."
                        />
                      </div>

                      {/* Image Upload Section */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Images du produit (5 max)
                        </label>

                        {/* Image upload input */}
                        <div className="mb-4">
                          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="text-center">
                              {uploadingImage ? (
                                <div className="text-purple-600">
                                  <div className="text-2xl mb-2">⏳</div>
                                  <p className="text-sm">Upload en cours...</p>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-4xl mb-2">📸</div>
                                  <p className="text-sm text-gray-600">
                                    Cliquez pour ajouter des images
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    JPG, PNG, GIF, WEBP (max 5MB chacune)
                                  </p>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleImageUpload(e, false)}
                              disabled={uploadingImage || newProduct.images.length >= 5}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Image preview grid */}
                        {newProduct.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {newProduct.images.map((imageUrl, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={`${API_BASE_URL.replace('/api', '')}${imageUrl}`}
                                  alt={`Product ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index, false)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Supprimer cette image"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                  {index + 1}/{newProduct.images.length}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50"
                        >
                          {saving ? 'Ajout en cours...' : 'Ajouter le Produit'}
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

                {/* Edit Product Form */}
                {showEditForm && editingProduct && (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h3 className="text-xl font-bold mb-6">Modifier le Produit</h3>
                    <form onSubmit={handleEditProduct} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">Nom du Produit</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Catégorie</label>
                          <select
                            value={editingProduct.category}
                            onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.icon} {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Prix (XAF)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={editingProduct.price}
                            onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Stock</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={editingProduct.stock}
                            onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Unité</label>
                          <input
                            type="text"
                            value={editingProduct.unit || 'unité'}
                            onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          required
                          value={editingProduct.description}
                          onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      {/* Image Upload Section for Edit */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Images du produit (5 max)
                        </label>

                        {/* Image upload input */}
                        <div className="mb-4">
                          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="text-center">
                              {uploadingImage ? (
                                <div className="text-purple-600">
                                  <div className="text-2xl mb-2">⏳</div>
                                  <p className="text-sm">Upload en cours...</p>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-4xl mb-2">📸</div>
                                  <p className="text-sm text-gray-600">
                                    Cliquez pour ajouter des images
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    JPG, PNG, GIF, WEBP (max 5MB chacune)
                                  </p>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleImageUpload(e, true)}
                              disabled={uploadingImage || editingProduct.images.length >= 5}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Image preview grid */}
                        {editingProduct.images && editingProduct.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {editingProduct.images.map((imageUrl, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={`${API_BASE_URL.replace('/api', '')}${imageUrl}`}
                                  alt={`Product ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index, true)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Supprimer cette image"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                  {index + 1}/{editingProduct.images.length}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50"
                        >
                          {saving ? 'Modification en cours...' : 'Enregistrer les Modifications'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditForm(false);
                            setEditingProduct(null);
                          }}
                          className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Products Grid */}
                {products.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-semibold mb-2">Aucun produit</h3>
                    <p className="text-gray-600 mb-6">Vous n'avez pas encore ajouté de produits.</p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
                    >
                      ➕ Ajouter votre premier produit
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                      <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="relative">
                          <img
                            src={
                              product.images && product.images.length > 0
                                ? `${API_BASE_URL.replace('/api', '')}${product.images[0]}`
                                : 'https://via.placeholder.com/300x200?text=Pas+d%27image'
                            }
                            alt={product.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/300x200?text=Pas+d%27image';
                            }}
                          />
                          <div className="absolute top-2 right-2 flex space-x-1">
                            <button
                              onClick={() => openEditForm(product)}
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
                          {product.images && product.images.length > 1 && (
                            <span className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 text-xs rounded">
                              +{product.images.length - 1} photo(s)
                            </span>
                          )}
                          {product.stock > 0 ? (
                            <span className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 text-xs rounded">
                              En Stock
                            </span>
                          ) : (
                            <span className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 text-xs rounded">
                              Rupture
                            </span>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xl font-bold text-purple-600">
                              {formatPrice(product.price)}
                            </span>
                            <span className="text-sm text-gray-500">
                              /{product.unit || 'unité'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Stock: {product.stock || 0}
                            </span>
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                              {getCategoryName(product.category)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
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

export default SellerProducts;
