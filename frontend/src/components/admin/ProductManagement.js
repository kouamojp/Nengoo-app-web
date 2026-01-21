
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const ProductManagement = (props) => {
    const { user } = props;
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null); // State for editing
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]);

    // State for new product form
    const [newProductData, setNewProductData] = useState({
        name: '',
        description: '',
        category: '',
        price: 0,
        promoPrice: 0,
        sellerId: '',
        sellerName: '',
        stock: 0,
        images: [''],
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [uploadMethod, setUploadMethod] = useState('url');

    // State for editing product image
    const [editingSelectedFile, setEditingSelectedFile] = useState(null);
    const [editingImageUrl, setEditingImageUrl] = useState('');
    const [editingUploadMethod, setEditingUploadMethod] = useState('url');


    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedProducts(filteredProducts.map(p => p.id));
        } else {
            setSelectedProducts([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedProducts([...selectedProducts, id]);
        } else {
            setSelectedProducts(selectedProducts.filter(productId => productId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedProducts.length} produits?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': user.role,
                    },
                    body: JSON.stringify({ ids: selectedProducts }),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Failed to delete products');
                }
                await fetchProducts();
                setSelectedProducts([]);
                alert('🗑️ Produits supprimés avec succès!');
            } catch (error) {
                console.error('Error deleting products:', error);
                alert(`Erreur: ${error.message}`);
            }
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/products`);
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Erreur lors de la récupération des catégories:", error);
            alert("Erreur: Impossible de charger les catégories. Veuillez en créer d'abord dans la section 'Catégories'.");
        }
    };

    const fetchSellers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/sellers`, {
                headers: { 'X-Admin-Role': 'super_admin' }
            });
            if (!response.ok) throw new Error('Failed to fetch sellers');
            const data = await response.json();
            setSellers(data);
        } catch (error) {
            console.error("Erreur lors de la récupération des vendeurs:", error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchSellers();
    }, []);

    const handleDeleteProduct = async (productId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-Admin-Role': user?.role || 'admin',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'Une erreur inconnue est survenue.' }));
                    throw new Error(errorData.detail || 'La suppression du produit a échoué.');
                }

                await fetchProducts();
                alert('Produit supprimé avec succès !');

            } catch (error) {
                console.error('Error deleting product:', error);
                alert(`Erreur lors de la suppression : ${error.message}`);
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'sellerId') {
            const selectedSeller = sellers.find(s => s.id === value);
            setNewProductData({
                ...newProductData,
                sellerId: value,
                sellerName: selectedSeller ? selectedSeller.businessName : ''
            });
        } else {
            setNewProductData({ ...newProductData, [name]: value });
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditingProduct({ ...editingProduct, [name]: value });
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        if (!editingProduct) return;

        setUploading(true);
        try {
            let finalImageUrl = editingProduct.images[0] || '';
            let imageUpdated = false;

            // Check if a new image URL is provided
            if (editingUploadMethod === 'url' && editingImageUrl.trim() && editingImageUrl !== finalImageUrl) {
                finalImageUrl = editingImageUrl.trim();
                imageUpdated = true;
            } 
            // Check if a new file is selected for upload
            else if (editingUploadMethod === 'file' && editingSelectedFile) {
                const presignedResponse = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Admin-Role': user?.role || 'admin' },
                    body: JSON.stringify({ fileName: editingSelectedFile.name, fileType: editingSelectedFile.type }),
                });

                if (!presignedResponse.ok) {
                    const err = await presignedResponse.json();
                    throw new Error(err.detail || 'Failed to get pre-signed URL for update.');
                }
                const { uploadUrl, publicUrl } = await presignedResponse.json();

                const uploadToS3Response = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': editingSelectedFile.type },
                    body: editingSelectedFile,
                });

                if (!uploadToS3Response.ok) {
                    throw new Error('Failed to upload new image to S3.');
                }
                finalImageUrl = publicUrl;
                imageUpdated = true;
            }

            const updatedProductData = {
                name: editingProduct.name,
                description: editingProduct.description,
                price: parseFloat(editingProduct.price),
                promoPrice: parseFloat(editingProduct.promoPrice),
                stock: parseInt(editingProduct.stock, 10),
                category: editingProduct.category,
                status: editingProduct.status,
                ...(imageUpdated && { images: [finalImageUrl] }),
            };
            
            const response = await fetch(`${API_BASE_URL}/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user?.role || 'admin',
                },
                body: JSON.stringify(updatedProductData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'La mise à jour du produit a échoué.');
            }

            await fetchProducts();
            setEditingProduct(null);
            // Reset editing image state
            setEditingImageUrl('');
            setEditingSelectedFile(null);
            alert('Produit mis à jour avec succès !');

        } catch (error) {
            console.error('Error updating product:', error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };
    
    const handleEditingFileChange = (e) => {
        setEditingSelectedFile(e.target.files[0]);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (uploadMethod === 'url' && !imageUrl.trim()) {
            alert('Veuillez entrer une URL d\'image valide.');
            return;
        }
        if (uploadMethod === 'file' && !selectedFile) {
            alert('Veuillez sélectionner une image pour le produit.');
            return;
        }

        setUploading(true);
        let finalImageUrl = '';

        try {
            if (uploadMethod === 'url') {
                finalImageUrl = imageUrl;
            } else {
                const presignedResponse = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Role': user?.role || 'admin',
                    },
                    body: JSON.stringify({
                        fileName: selectedFile.name,
                        fileType: selectedFile.type,
                    }),
                });

                if (!presignedResponse.ok) {
                    const err = await presignedResponse.json();
                    throw new Error(err.detail || 'Failed to get pre-signed URL');
                }
                const { uploadUrl, publicUrl } = await presignedResponse.json();

                const uploadToS3Response = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': selectedFile.type },
                    body: selectedFile,
                });

                if (!uploadToS3Response.ok) {
                    throw new Error('Failed to upload file to S3');
                }
                finalImageUrl = publicUrl;
            }

            const finalSellerId = newProductData.sellerId || (user ? user.id : 'admin_default');
            const finalSellerName = newProductData.sellerName || (user ? user.name : 'Admin');

            const productToCreate = {
                ...newProductData,
                sellerId: finalSellerId,
                sellerName: finalSellerName,
                images: [finalImageUrl],
            };

            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': user?.role || 'admin',
                },
                body: JSON.stringify(productToCreate),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to create product');
            }
            await fetchProducts();
            setShowAddModal(false);
            setNewProductData({
                name: '', description: '', category: '', price: 0, promoPrice: 0, sellerId: '', sellerName: '', stock: 0, images: [''],
            });
            setSelectedFile(null);
            setImageUrl('');
            alert('✅ Produit ajouté avec succès!');
        } catch (error) {
            console.error('Error adding product:', error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'XAF',
          minimumFractionDigits: 0,
        }).format(price);
      };

    const filteredProducts = products.filter(product => {
        const query = searchQuery.toLowerCase();
        return (
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query) ||
            product.sellerName.toLowerCase().includes(query)
        );
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6 max-sm:flex-wrap max-sm:gap-4">
                <h2 className="text-xl md:text-3xl font-bold">Gestion des produits ({filteredProducts.length})</h2>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedProducts.length === 0}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                    >
                        Supprimer la sélection
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                        + Ajouter un Produit
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Rechercher des produits..."
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">✏️ Modifier le produit</h2>
                            <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleUpdateProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit</label>
                                <input type="text" name="name" value={editingProduct.name} onChange={handleEditInputChange} className="w-full px-4 py-3 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea name="description" value={editingProduct.description} onChange={handleEditInputChange} className="w-full px-4 py-3 border rounded-lg" rows="3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                                <div className="flex items-center space-x-4 mb-4">
                                    <img src={editingProduct.images[0]} alt={editingProduct.name} className="w-16 h-16 rounded object-cover" />
                                    <p className="text-xs text-gray-500">Image actuelle. Choisissez une nouvelle méthode pour la remplacer.</p>
                                </div>
                                
                                {/* Choix de la méthode d'upload */}
                                <div className="flex flex-col space-y-2 mb-4 p-4 bg-gray-50 rounded-lg">
                                    <label className="flex items-center cursor-pointer p-3 border-2 border-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                                        <input
                                            type="radio"
                                            name="editingUploadMethod"
                                            value="url"
                                            checked={editingUploadMethod === 'url'}
                                            onChange={(e) => setEditingUploadMethod(e.target.value)}
                                            className="mr-3"
                                        />
                                        <div>
                                            <span className="text-sm font-semibold text-blue-700">Nouvelle URL d'image</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center cursor-pointer p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition">
                                        <input
                                            type="radio"
                                            name="editingUploadMethod"
                                            value="file"
                                            checked={editingUploadMethod === 'file'}
                                            onChange={(e) => setEditingUploadMethod(e.target.value)}
                                            className="mr-3"
                                        />
                                        <div>
                                            <span className="text-sm font-semibold">Nouveau fichier (Upload)</span>
                                        </div>
                                    </label>
                                </div>

                                {editingUploadMethod === 'url' ? (
                                    <div>
                                        <input
                                            type="url"
                                            value={editingImageUrl}
                                            onChange={(e) => setEditingImageUrl(e.target.value)}
                                            placeholder="https://exemple.com/nouvelle-image.jpg"
                                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Laissez vide pour conserver l'image actuelle.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="file"
                                            onChange={handleEditingFileChange}
                                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            accept="image/*"
                                        />
                                         <p className="text-xs text-gray-500 mt-1">Laissez vide pour conserver l'image actuelle.</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                                <select name="category" value={editingProduct.category} onChange={handleEditInputChange} className="w-full px-4 py-3 border rounded-lg">
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix (XAF)</label>
                                    <input type="number" name="price" value={editingProduct.price} onChange={handleEditInputChange} className="w-full px-4 py-3 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix Promo (XAF)</label>
                                    <input type="number" name="promoPrice" value={editingProduct.promoPrice || ''} onChange={handleEditInputChange} className="w-full px-4 py-3 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                                    <input type="number" name="stock" value={editingProduct.stock} onChange={handleEditInputChange} className="w-full px-4 py-3 border rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                                <select name="status" value={editingProduct.status} onChange={handleEditInputChange} className="w-full px-4 py-3 border rounded-lg">
                                    <option value="approved">Approuvé</option>
                                    <option value="pending">En attente</option>
                                    <option value="rejected">Rejeté</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold" disabled={uploading}>
                                {uploading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">📦 Ajouter un nouveau produit</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleAddProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit *</label>
                                <input type="text" name="name" value={newProductData.name} onChange={handleInputChange} placeholder="Ex: Smartphone Samsung Galaxy" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                                <textarea name="description" value={newProductData.description} onChange={handleInputChange} placeholder="Description détaillée du produit" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" rows="3" required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                                <select name="category" value={newProductData.category} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required>
                                    <option value="">-- Sélectionnez une catégorie --</option>
                                    {categories.length > 0 ? (
                                        categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Aucune catégorie disponible</option>
                                    )}
                                </select>
                                {categories.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">⚠️ Aucune catégorie trouvée. Veuillez créer des catégories d'abord.</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">Nombre de catégories: {categories.length}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix (XAF) *</label>
                                    <input type="number" name="price" value={newProductData.price} onChange={handleInputChange} placeholder="0" min="0" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix Promo (XAF)</label>
                                    <input type="number" name="promoPrice" value={newProductData.promoPrice} onChange={handleInputChange} placeholder="0" min="0" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
                                    <input type="number" name="stock" value={newProductData.stock} onChange={handleInputChange} placeholder="0" min="0" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vendeur (optionnel - Admin par défaut)</label>
                                <select name="sellerId" value={newProductData.sellerId} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="">-- Admin (par défaut) --</option>
                                    {sellers.length > 0 ? (
                                        sellers.map((seller) => (
                                            <option key={seller.id} value={seller.id}>
                                                {seller.businessName} ({seller.city})
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Aucun vendeur enregistré</option>
                                    )}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {sellers.length > 0
                                        ? `${sellers.length} vendeur(s) disponible(s). Si aucun n'est sélectionné, le produit sera attribué à l'admin.`
                                        : "Aucun vendeur enregistré. Le produit sera attribué à l'admin."
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Image du produit *</label>

                                {/* Choix de la méthode d'upload */}
                                <div className="flex flex-col space-y-2 mb-4 p-4 bg-gray-50 rounded-lg">
                                    <label className="flex items-center cursor-pointer p-3 border-2 border-green-500 bg-green-50 rounded-lg hover:bg-green-100 transition">
                                        <input
                                            type="radio"
                                            name="uploadMethod"
                                            value="url"
                                            checked={uploadMethod === 'url'}
                                            onChange={(e) => setUploadMethod(e.target.value)}
                                            className="mr-3"
                                        />
                                        <div>
                                            <span className="text-sm font-semibold text-green-700">✅ URL d'image (Recommandé)</span>
                                            <p className="text-xs text-gray-600 mt-1">Simple et rapide - aucune configuration requise</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center cursor-pointer p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition">
                                        <input
                                            type="radio"
                                            name="uploadMethod"
                                            value="file"
                                            checked={uploadMethod === 'file'}
                                            onChange={(e) => setUploadMethod(e.target.value)}
                                            className="mr-3"
                                        />
                                        <div>
                                            <span className="text-sm font-semibold">📤 Upload fichier (AWS S3)</span>
                                            <p className="text-xs text-orange-600 mt-1">Nécessite configuration CORS sur S3</p>
                                        </div>
                                    </label>
                                </div>

                                {uploadMethod === 'url' ? (
                                    <div>
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="https://exemple.com/image.jpg"
                                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            💡 Méthode recommandée : Entrez l'URL d'une image hébergée en ligne
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="file"
                                            name="imageFile"
                                            onChange={handleFileChange}
                                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                            accept="image/*"
                                            required
                                        />
                                        <p className="text-xs text-orange-600 mt-1">
                                            ⚠️ Nécessite configuration AWS S3 (variables d'environnement requises)
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Formats acceptés: JPG, PNG, WEBP (max 5MB)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors" disabled={uploading}>
                                {uploading ? '📤 Téléchargement en cours...' : '✅ Ajouter le produit'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-auto">
                {loading ? <p className="p-6">Chargement...</p> : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendeur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Promo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.includes(product.id)}
                                            onChange={(e) => handleSelectOne(e, product.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium">{product.name}</td>
                                    <td className="px-6 py-4 text-sm">{product.sellerName}</td>
                                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(product.price)}</td>
                                    <td className="px-6 py-4 text-sm">{product.promoPrice && product.promoPrice > 0 ? formatPrice(product.promoPrice) : '-'}</td>
                                    <td className="px-6 py-4 text-sm">{product.stock}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${product.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setEditingProduct(product)} className="text-blue-600 hover:text-blue-800 font-semibold text-sm">Modifier</button>
                                        <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-800 font-semibold text-sm ml-4">Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ProductManagement;
