
import React, { useState, useEffect } from 'react';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerProducts = (props) => {
    const { language } = props;
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newProduct, setNewProduct] = useState({
      name: '',
      description: '',
      category: 'clothing_accessories',
      price: 0,
      stock: 0,
      images: [],
    });
    const [selectedFiles, setSelectedFiles] = useState([]);

    const fetchProducts = async () => {
      if (props.user) {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE_URL}/products?seller_id=${props.user.id}`);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          /* console.log("✅ [Vendeur] Produits récupérés:", data.length, "produit(s)");
          console.log("📦 [Vendeur] Données brutes:", data); */

          const adaptedProducts = data.map(p => ({
              ...p,
              name: { [language]: p.name },
              description: { [language]: p.description },
              image: p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/300',
              inStock: p.stock > 0,
              rating: p.rating || 0,
              reviews: p.reviewsCount || 0,
            }));

          console.log("✨ [Vendeur] Produits adaptés:", adaptedProducts.length, "produit(s)");
          setProducts(adaptedProducts);
        } catch (error) {
          console.error("❌ [Vendeur] Erreur lors de la récupération des produits:", error);
          alert("Erreur: Impossible de charger les produits. Vérifiez que le backend est lancé et accessible.");
        } finally {
          setLoading(false);
        }
      }
    };
  
    useEffect(() => {
      fetchProducts();
    }, [props.user, language]);
  
    const handleAddProduct = async (e) => {
      e.preventDefault();

      if (!props.user || props.user.type !== 'seller') {
        alert("Vous devez être connecté en tant que vendeur pour ajouter un produit.");
        return;
      }

      const uploadedImageUrls = [];
      for (const file of selectedFiles) {
        try {
          // 1. Get presigned URL from your backend
          const presignedResponse = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Seller-Id': props.user.id,
            },
            body: JSON.stringify({ fileName: file.name, fileType: file.type }),
          });
          if (!presignedResponse.ok) {
            throw new Error('Failed to get presigned URL');
          }
          const { uploadUrl, publicUrl } = await presignedResponse.json();
  
          // 2. Upload image directly to S3 using the presigned URL
          const uploadResult = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type,
            },
          });
          if (!uploadResult.ok) {
            throw new Error('Failed to upload image to S3');
          }
          uploadedImageUrls.push(publicUrl);
        } catch (error) {
          console.error("Error uploading file:", error);
          alert(`Erreur lors du téléchargement de l'image ${file.name}: ${error.message}`);
          return; // Stop the process if any upload fails
        }
      }

      const productData = {
          ...newProduct,
          sellerId: props.user.id,
          sellerName: props.user.businessName,
          images: uploadedImageUrls,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Seller-Id': props.user.id,
          },
          body: JSON.stringify(productData),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create product');
        }
  
        await fetchProducts(); // Refetch products to include the new one
        setShowAddForm(false);
        setNewProduct({
            name: '',
            description: '',
            category: 'clothing_accessories',
            price: 0,
            stock: 0,
            images: [],
        });
        setSelectedFiles([]); // Clear selected files after successful upload
      } catch (error) {
        alert(`Erreur: ${error.message}`);
      }
    };
  
    const handleDeleteProduct = async (id) => {
      if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Seller-Id': props.user.id,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to delete product');
            }
            await fetchProducts(); // Refetch products after deletion
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
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
                        <label className="block text-sm font-medium mb-2">Nom du produit</label>
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
                        >
                          <option value="clothing_accessories">Vêtements et Accessoires</option>
                          <option value="food_drinks">Aliments et Boissons</option>
                          <option value="electronics">Électroniques</option>
                          <option value="home_garden">Maison & Jardinage</option>
                          <option value="handicrafts">Artisanat</option>
                          <option value="beauty_care">Beauté et Soins</option>
                          {/* Add other categories as needed */}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Prix (XAF)</label>
                        <input
                          type="number"
                          required
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Stock</label>
                        <input
                          type="number"
                          required
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Images du produit</label>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {selectedFiles.map((file, index) => (
                                <img key={index} src={URL.createObjectURL(file)} alt={`preview-${index}`} className="w-20 h-20 object-cover rounded-lg" />
                            ))}
                        </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        required
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
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
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
                  <p className="text-lg text-gray-600">Chargement des produits...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold mb-2">Aucun produit enregistré</h3>
                  <p className="text-gray-600 mb-4">Vous n'avez pas encore de produits dans votre boutique.</p>
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
                        src={product.image}
                        alt={product.name[language]}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <button
                          onClick={() => setEditingProduct(product)}
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
                        {product.description ? product.description[language] : ''}
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
              )}
            </div>
          </div>
        </div>
        
        <Footer language={language} />
      </div>
    );
  };

  export default SellerProducts;
