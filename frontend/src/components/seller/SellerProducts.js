
import React, { useState, useEffect } from 'react';
import SellerHeader from './SellerHeader';
import ColorPicker from './ColorPicker';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerProducts = (props) => {
    const { language, user } = props;
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newProduct, setNewProduct] = useState({
      name: '',
      description: '',
      category: '',
      price: 0,
      promoPrice: 0,
      stock: 0,
      images: [],
      colors: [],
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);

    const handleSelectProduct = (e, id) => {
        if (e.target.checked) {
            setSelectedProducts([...selectedProducts, id]);
        } else {
            setSelectedProducts(selectedProducts.filter(prodId => prodId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedProducts.length} produits?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Seller-Id': props.user.id, // Or admin role
                    },
                    body: JSON.stringify({ ids: selectedProducts }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    try {
                        const err = JSON.parse(errorText);
                        throw new Error(err.detail || 'Failed to delete products');
                    } catch (e) {
                        throw new Error(errorText || 'Failed to delete products');
                    }
                }
                await fetchProducts();
                setSelectedProducts([]);
                alert('Produits supprimés.');
            } catch (error) {
                console.error('Error deleting products:', error);
                alert(`Erreur: ${error.message}`);
            }
        }
    };

    const fetchProducts = async () => {
      if (props.user) {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE_URL}/products?seller_id=${props.user.id}`);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
        const adaptedProducts = data.map(p => ({
          ...p,
          name: p.name,
          description: p.description,
          category: p.category,
          price: p.price,
          stock: p.stock,
          image: p.images && p.images.length > 0 ? p.images[0] : process.env.PUBLIC_URL + '/images/logo-nengoo.png'
        }));
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

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/categories`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setAvailableCategories(data);
                // Catégorie par défaut du formulaire : une catégorie qui existe vraiment
                if (data.length > 0) {
                    setNewProduct(p => (data.some(c => c.id === p.category) ? p : { ...p, category: data[0].id }));
                }
            } catch (error) {
                console.error("❌ Erreur lors de la récupération des catégories:", error);
                // Optionally, alert the user or handle the error gracefully
            }
        };

        fetchCategories();
    }, []); // Empty dependency array means this runs once on mount
  
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
            category: availableCategories[0]?.id || '',
            price: 0,
            promoPrice: 0,
            stock: 0,
            images: [],
            colors: [],
        });
        setSelectedFiles([]); // Clear selected files after successful upload
      } catch (error) {
        alert(`Erreur: ${error.message}`);
      }
    };
  
    const handleUpdateProduct = async (e) => {
      e.preventDefault();

      if (!editingProduct) return;

      const uploadedImageUrls = [];
      if (selectedFiles.length > 0) {
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
      }

      const productData = {
          ...editingProduct,
          images: uploadedImageUrls.length > 0 ? uploadedImageUrls : editingProduct.images,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Seller-Id': props.user.id,
          },
          body: JSON.stringify(productData),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to update product');
        }
  
        await fetchProducts(); // Refetch products to include the updated one
        setEditingProduct(null);
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
      <div>
        <SellerHeader
          title="Produits"
          description={`${products.length} produit${products.length > 1 ? 's' : ''} dans votre boutique`}
          actions={(
            <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="adm-btn adm-btn-primary">
              Ajouter un produit
            </button>
          )}
        />

        {selectedProducts.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-purple-950 text-white" role="region" aria-label="Sélection">
            <span className="font-semibold">{selectedProducts.length} sélectionné{selectedProducts.length > 1 ? 's' : ''}</span>
            <button type="button" onClick={() => setSelectedProducts([])} className="!min-h-0 text-sm text-purple-200 hover:text-white underline underline-offset-4">
              Tout désélectionner
            </button>
            <button type="button" onClick={handleBulkDelete} className="adm-btn adm-btn-danger ml-auto">
              Supprimer la sélection
            </button>
          </div>
        )}

        {/* Edit Product Form */}
        {editingProduct && (
          <div className="adm-card p-5 sm:p-6 mb-6">
            <h2 className="adm-modal-title mb-5">Modifier le produit</h2>
            <form onSubmit={handleUpdateProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="adm-label">Nom du produit</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="adm-input"
                  />
                </div>
                <div>
                  <label className="adm-label">Catégorie</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="adm-input"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="adm-label">Prix (XAF)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                    className="adm-input"
                  />
                </div>
                <div>
                  <label className="adm-label">Prix Promotionnel (XAF)</label>
                  <input
                    type="number"
                    value={editingProduct.promoPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, promoPrice: parseInt(e.target.value) || 0 })}
                    className="adm-input"
                  />
                </div>
                <div>
                  <label className="adm-label">Stock</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="adm-input"
                  />
                </div>
              </div>
              
              <ColorPicker
                value={editingProduct.colors || []}
                onChange={(colors) => setEditingProduct({ ...editingProduct, colors })}
              />

              <div>
                <label className="adm-label">Visibilité</label>
                <select
                  value={editingProduct.status === 'inactive' ? 'inactive' : 'approved'}
                  disabled={editingProduct.status !== 'approved' && editingProduct.status !== 'inactive'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                  className="adm-input"
                >
                  <option value="approved">En vente</option>
                  <option value="inactive">Archivé (masqué du catalogue)</option>
                </select>
              </div>

              <div>
                  <label className="adm-label">Images du produit</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    className="adm-input"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                          <img key={index} src={URL.createObjectURL(file)} alt={`preview-${index}`} className="w-20 h-20 object-cover rounded-lg" />
                      ))}
                  </div>
              </div>

              <div>
                <label className="adm-label">Description</label>
                <textarea
                  required
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                  className="adm-input"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="adm-btn adm-btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Product Form */}
        {showAddForm && (
          <div className="adm-card p-5 sm:p-6 mb-6">
            <h2 className="adm-modal-title mb-5">Nouveau produit</h2>
            <form onSubmit={handleAddProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="adm-label">Nom du produit</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="adm-input"
                  />
                </div>
                <div>
                  <label className="adm-label">Catégorie</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="adm-input"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="adm-label">Prix (XAF)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                    className="adm-input"
                  />
                </div>
                <div>
                  <label className="adm-label">Prix Promotionnel (XAF)</label>
                  <input
                    type="number"
                    value={newProduct.promoPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, promoPrice: parseInt(e.target.value) || 0 })}
                    className="adm-input"
                  />
                </div>
                <div>
                  <label className="adm-label">Stock</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                    className="adm-input"
                  />
                </div>
              </div>
              
              <ColorPicker
                value={newProduct.colors}
                onChange={(colors) => setNewProduct({ ...newProduct, colors })}
              />

              <div>
                  <label className="adm-label">Images du produit</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    className="adm-input"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                          <img key={index} src={URL.createObjectURL(file)} alt={`preview-${index}`} className="w-20 h-20 object-cover rounded-lg" />
                      ))}
                  </div>
              </div>

              <div>
                <label className="adm-label">Description</label>
                <textarea
                  required
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={3}
                  className="adm-input"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                >
                  Ajouter le produit
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="adm-btn adm-btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des produits */}
        {loading ? (
          <p className="adm-card px-5 py-12 text-center text-gray-600">Chargement des produits…</p>
        ) : products.length === 0 ? (
          <div className="adm-card px-5 py-12 text-center">
            <h2 className="text-lg font-extrabold text-purple-950">Aucun produit pour l'instant</h2>
            <p className="mt-1 text-gray-600">Ajoutez un premier produit : il sera visible dans le catalogue dès sa création.</p>
            <button type="button" onClick={() => setShowAddForm(true)} className="adm-btn adm-btn-primary mt-5">
              Ajouter un produit
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map(product => {
              const categoryName = availableCategories.find(c => c.id === product.category)?.name;
              const hasPromo = product.promoPrice > 0 && product.promoPrice < product.price;
              return (
                <li key={product.id} className={`adm-card overflow-hidden flex flex-col ${product.status === 'inactive' ? 'opacity-70' : ''}`}>
                  <div className="relative bg-gray-100">
                    <img src={product.image} alt="" className="w-full aspect-square object-cover" loading="lazy" />
                    <label className="absolute top-2 left-2 flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-purple-700"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => handleSelectProduct(e, product.id)}
                        aria-label={`Sélectionner ${product.name}`}
                      />
                    </label>
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      {product.status === 'inactive' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-white">Archivé</span>
                      )}
                      {product.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-300 text-purple-950">En attente</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`price text-xl tabular-nums ${hasPromo ? 'text-red-700' : 'text-purple-950'}`}>
                        {formatPrice(hasPromo ? product.promoPrice : product.price)}
                      </span>
                      {hasPromo && <span className="text-sm text-gray-500 line-through">{formatPrice(product.price)}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${product.stock > 0 ? (product.stock < 5 ? 'bg-yellow-100 text-yellow-900' : 'bg-green-100 text-green-800') : 'bg-red-100 text-red-800'}`}>
                        {product.stock > 0 ? `Stock : ${product.stock}` : 'Rupture'}
                      </span>
                      {categoryName && <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800">{categoryName}</span>}
                      {product.colors?.length > 0 && (
                        <span className="flex items-center gap-0.5" role="img" aria-label={`${product.colors.length} couleur(s)`}>
                          {product.colors.slice(0, 5).map(c => (
                            <span key={c} className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: c }} />
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto pt-4 flex gap-2">
                      <button type="button" onClick={() => setEditingProduct(product)} className="adm-btn adm-btn-secondary flex-1">
                        Modifier
                      </button>
                      <button type="button" onClick={() => handleDeleteProduct(product.id)} className="adm-btn adm-btn-secondary !text-red-700" aria-label={`Supprimer ${product.name}`}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  export default SellerProducts;
