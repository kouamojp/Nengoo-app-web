import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  getAllSellers,
  uploadProductImage,
  deleteProductImage,
  initSystemSeller
} from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

export const AdminProducts = (props) => {
  const { setUser } = props;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    sellerId: '',
    stock: '0',
    unit: 'unité',
    images: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Initialize system seller first
      await initSystemSeller();

      const [productsData, categoriesData, sellersData] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
        getAllSellers()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      const approvedSellers = sellersData.filter(s => s.status === 'approved');
      setSellers(approvedSellers);

      // Set default seller (system seller) if not editing
      if (approvedSellers.length > 0 && !editingProduct) {
        const systemSeller = approvedSellers.find(s => s.whatsapp === 'SYSTEM_NENGOO');
        if (systemSeller) {
          setFormData(prev => ({ ...prev, sellerId: systemSeller.id }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    // Limit to 5 images total
    if (formData.images.length + files.length > 5) {
      alert('Vous ne pouvez ajouter que 5 images maximum');
      return;
    }

    setUploadingImage(true);

    try {
      const uploadPromises = files.map(file => uploadProductImage(file));
      const uploadedImages = await Promise.all(uploadPromises);

      const imageUrls = uploadedImages.map(img => img.url);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...imageUrls]
      }));

      alert(`${files.length} image(s) uploadée(s) avec succès`);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert(error.message || 'Erreur lors de l\'upload des images');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.price || !formData.category || !formData.sellerId) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
        images: formData.images
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        await loadData();
        alert('Produit mis à jour avec succès');
      } else {
        await createProduct(productData);
        await loadData();
        alert('Produit créé avec succès');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.message || 'Erreur lors de l\'enregistrement du produit');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      sellerId: product.sellerId,
      stock: product.stock?.toString() || '0',
      unit: product.unit || 'unité',
      images: product.images || []
    });
    setShowAddForm(true);
  };

  const handleDelete = async (productId) => {
    if (deleteConfirm !== productId) {
      setDeleteConfirm(productId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      setDeleteConfirm(null);
      alert('Produit supprimé avec succès');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Erreur lors de la suppression du produit');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      sellerId: '',
      stock: '0',
      unit: 'unité',
      images: []
    });
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const getSellerName = (product) => {
    // Use sellerName from API if available (enriched by backend)
    if (product.sellerName) {
      return product.sellerName;
    }

    // Fallback to finding seller in local state
    const seller = sellers.find(s => s.id === product.sellerId);
    return seller?.businessName || seller?.name || 'N/A';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSellerName(product).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === 'all' || product.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestion des Produits</h1>
              <p className="text-gray-600 mt-2">
                Total: {products.length} produit(s)
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(true);
                // Set default seller when opening form
                const systemSeller = sellers.find(s => s.whatsapp === 'SYSTEM_NENGOO');
                if (systemSeller) {
                  setFormData(prev => ({ ...prev, sellerId: systemSeller.id }));
                }
              }}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              disabled={sellers.length === 0 || categories.length === 0}
            >
              + Ajouter un produit
            </button>
          </div>

          {(sellers.length === 0 || categories.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Attention:</strong> Vous devez avoir au moins une catégorie et un vendeur approuvé pour ajouter des produits.
              </p>
            </div>
          )}

          {showAddForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du produit *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: Tomates fraîches"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix (FCFA) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="1000"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Description du produit"
                    rows="3"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendeur *
                    </label>
                    <select
                      name="sellerId"
                      value={formData.sellerId}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Sélectionner un vendeur</option>
                      {sellers.map(seller => (
                        <option key={seller.id} value={seller.id}>
                          {seller.whatsapp === 'SYSTEM_NENGOO'
                            ? `🏢 ${seller.businessName || seller.name} (Par défaut)`
                            : seller.businessName || seller.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Par défaut: Nengoo Marketplace (produit de la plateforme)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unité
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: kg, pièce, litre"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        onChange={handleImageUpload}
                        disabled={uploadingImage || formData.images.length >= 5}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Image preview grid */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={`${API_BASE_URL.replace('/api', '')}${imageUrl}`}
                            alt={`Product ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Supprimer cette image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            {index + 1}/{formData.images.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    {editingProduct ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Rechercher par nom, description ou vendeur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Chargement des produits...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterCategory !== 'all'
                  ? 'Aucun produit trouvé'
                  : 'Aucun produit créé'}
              </p>
              {!searchTerm && filterCategory === 'all' && sellers.length > 0 && categories.length > 0 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Créer le premier produit
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Product image or placeholder */}
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={`${API_BASE_URL.replace('/api', '')}${product.images[0]}`}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-4xl">
                          📦
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {product.name}
                          </h3>
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {product.category}
                          </span>
                          {product.images && product.images.length > 1 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              +{product.images.length - 1} photo(s)
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{product.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div>
                            <strong>Prix:</strong> {product.price} FCFA/{product.unit}
                          </div>
                          <div>
                            <strong>Stock:</strong> {product.stock}
                          </div>
                          <div>
                            <strong>Vendeur:</strong> {getSellerName(product)}
                          </div>
                          <div>
                            <strong>Statut:</strong>{' '}
                            <span className={`${product.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                              {product.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(product)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                          deleteConfirm === product.id
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {deleteConfirm === product.id ? 'Confirmer ?' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
