
import React, { useState, useEffect } from 'react';
import { notify, confirmAction } from './adminFeedback';
import { SectionHeader, Toolbar, SearchInput, SelectionBar, StatusBadge, EmptyRow, LoadingRows, Modal, Field, ChoiceCards } from './AdminUI';

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
    const [selectedSellerId, setSelectedSellerId] = useState(''); // Filtre par vendeur
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
        if (await confirmAction({ title: `Supprimer ${selectedProducts.length} produit(s) ?`, message: 'Ils seront retirés du site. Cette action est définitive.' })) {
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
                notify('Produits supprimés avec succès.', 'success');
            } catch (error) {
                console.error('Error deleting products:', error);
                notify(error.message, 'error');
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
            notify("Impossible de charger les catégories. Si aucune n'existe encore, créez-en une dans la section Catégories.", 'error');
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
        if (await confirmAction({ title: 'Supprimer ce produit ?', message: 'Il sera retiré du site. Cette action est définitive.' })) {
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
                notify('Produit supprimé avec succès.', 'success');

            } catch (error) {
                console.error('Error deleting product:', error);
                notify(`La suppression a échoué : ${error.message}`, 'error');
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
            notify('Produit mis à jour avec succès.', 'success');

        } catch (error) {
            console.error('Error updating product:', error);
            notify(error.message, 'error');
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
            notify('Veuillez entrer une URL d\'image valide.', 'error');
            return;
        }
        if (uploadMethod === 'file' && !selectedFile) {
            notify('Veuillez sélectionner une image pour le produit.', 'error');
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
            notify('Produit ajouté avec succès.', 'success');
        } catch (error) {
            console.error('Error adding product:', error);
            notify(error.message, 'error');
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
        const matchesSearch = (
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            (categories.find(c => c.id === product.category)?.name || '').toLowerCase().includes(query) ||
            product.sellerName.toLowerCase().includes(query)
        );

        // Filtrer par vendeur si un vendeur est sélectionné
        const matchesSeller = selectedSellerId === '' || product.sellerId === selectedSellerId;

        return matchesSearch && matchesSeller;
    });

    // Les produits référencent leur catégorie par id (comme le formulaire vendeur et le catalogue public)
    const categoryName = (categoryId) => categories.find(c => c.id === categoryId)?.name;

    // Options de catégorie ; une catégorie inconnue est conservée pour ne pas être écrasée à l'enregistrement
    const categoryOptions = (currentValue) => (
        <>
            {currentValue && !categoryName(currentValue) && (
                <option value={currentValue}>{currentValue} (catégorie supprimée)</option>
            )}
            {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
        </>
    );

    const closeEditModal = () => {
        setEditingProduct(null);
        setEditingImageUrl('');
        setEditingSelectedFile(null);
    };

    const COLUMNS = 7;

    return (
        <div>
            <SectionHeader
                title="Produits"
                count={filteredProducts.length}
                actions={
                    <button onClick={() => setShowAddModal(true)} className="adm-btn adm-btn-primary">
                        Ajouter un produit
                    </button>
                }
            />

            <Toolbar>
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher par nom, description ou vendeur" />
                <select
                    value={selectedSellerId}
                    onChange={(e) => setSelectedSellerId(e.target.value)}
                    aria-label="Filtrer par vendeur"
                    className="adm-input w-auto max-w-xs"
                >
                    <option value="">Tous les vendeurs</option>
                    {sellers.map((seller) => {
                        const sellerProductCount = products.filter(p => p.sellerId === seller.id).length;
                        return (
                            <option key={seller.id} value={seller.id}>
                                {seller.businessName} ({sellerProductCount})
                            </option>
                        );
                    })}
                </select>
                {selectedSellerId && (
                    <button type="button" onClick={() => setSelectedSellerId('')} className="adm-link !min-h-0 text-sm">
                        Retirer le filtre
                    </button>
                )}
            </Toolbar>

            <SelectionBar
                count={selectedProducts.length}
                onDelete={handleBulkDelete}
                onClear={() => setSelectedProducts([])}
            />

            {/* Edit Product Modal */}
            {editingProduct && (
                <Modal title="Modifier le produit" onClose={closeEditModal}>
                    <form onSubmit={handleUpdateProduct} className="space-y-4">
                        <Field label="Nom du produit">
                            <input type="text" name="name" value={editingProduct.name} onChange={handleEditInputChange} className="adm-input" />
                        </Field>
                        <Field label="Description">
                            <textarea name="description" value={editingProduct.description} onChange={handleEditInputChange} className="adm-input" rows="3" />
                        </Field>

                        <fieldset className="space-y-3">
                            <legend className="adm-label">Image</legend>
                            <div className="flex items-center gap-3">
                                <img src={editingProduct.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                                <p className="text-sm text-gray-600">Image actuelle. Pour la remplacer, indiquez une nouvelle URL ou un fichier.</p>
                            </div>
                            <ChoiceCards
                                name="editingUploadMethod"
                                value={editingUploadMethod}
                                onChange={setEditingUploadMethod}
                                options={[
                                    { value: 'url', label: 'Adresse (URL) d\'une image' },
                                    { value: 'file', label: 'Fichier depuis l\'ordinateur' },
                                ]}
                            />
                            {editingUploadMethod === 'url' ? (
                                <input
                                    type="url"
                                    value={editingImageUrl}
                                    onChange={(e) => setEditingImageUrl(e.target.value)}
                                    placeholder="https://exemple.com/nouvelle-image.jpg"
                                    aria-label="Nouvelle URL d'image"
                                    className="adm-input"
                                />
                            ) : (
                                <input type="file" onChange={handleEditingFileChange} className="adm-input py-2" accept="image/*" aria-label="Nouveau fichier image" />
                            )}
                            <p className="text-xs text-gray-500">Laissez vide pour conserver l'image actuelle.</p>
                        </fieldset>

                        <Field label="Catégorie">
                            <select name="category" value={editingProduct.category} onChange={handleEditInputChange} className="adm-input">
                                {categoryOptions(editingProduct.category)}
                            </select>
                        </Field>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Field label="Prix (FCFA)">
                                <input type="number" name="price" value={editingProduct.price} onChange={handleEditInputChange} min="0" className="adm-input" />
                            </Field>
                            <Field label="Prix promo (FCFA)">
                                <input type="number" name="promoPrice" value={editingProduct.promoPrice || ''} onChange={handleEditInputChange} min="0" className="adm-input" />
                            </Field>
                            <Field label="Stock">
                                <input type="number" name="stock" value={editingProduct.stock} onChange={handleEditInputChange} min="0" className="adm-input" />
                            </Field>
                        </div>
                        <Field label="Statut">
                            <select name="status" value={editingProduct.status} onChange={handleEditInputChange} className="adm-input">
                                <option value="approved">Approuvé</option>
                                <option value="pending">En attente</option>
                                <option value="rejected">Refusé</option>
                            </select>
                        </Field>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={closeEditModal} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary" disabled={uploading}>
                                {uploading ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showAddModal && (
                <Modal title="Ajouter un produit" onClose={() => setShowAddModal(false)}>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <Field label="Nom du produit" required>
                            <input type="text" name="name" value={newProductData.name} onChange={handleInputChange} placeholder="Ex. : Smartphone Samsung Galaxy" className="adm-input" required />
                        </Field>
                        <Field label="Description" required>
                            <textarea name="description" value={newProductData.description} onChange={handleInputChange} className="adm-input" rows="3" required />
                        </Field>
                        <Field
                            label="Catégorie"
                            required
                            hint={categories.length === 0 ? 'Aucune catégorie : créez-en une dans la section Catégories.' : undefined}
                        >
                            <select name="category" value={newProductData.category} onChange={handleInputChange} className="adm-input" required>
                                <option value="">Choisir une catégorie</option>
                                {categoryOptions('')}
                            </select>
                        </Field>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Field label="Prix (FCFA)" required>
                                <input type="number" name="price" value={newProductData.price} onChange={handleInputChange} min="0" className="adm-input" required />
                            </Field>
                            <Field label="Prix promo (FCFA)">
                                <input type="number" name="promoPrice" value={newProductData.promoPrice} onChange={handleInputChange} min="0" className="adm-input" />
                            </Field>
                            <Field label="Stock" required>
                                <input type="number" name="stock" value={newProductData.stock} onChange={handleInputChange} min="0" className="adm-input" required />
                            </Field>
                        </div>
                        <Field label="Vendeur" hint="Sans vendeur choisi, le produit est attribué à l'administration.">
                            <select name="sellerId" value={newProductData.sellerId} onChange={handleInputChange} className="adm-input">
                                <option value="">Administration</option>
                                {sellers.map((seller) => (
                                    <option key={seller.id} value={seller.id}>
                                        {seller.businessName} ({seller.city})
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <fieldset className="space-y-3">
                            <legend className="adm-label">Image du produit <span className="text-red-600" aria-hidden="true">*</span></legend>
                            <ChoiceCards
                                name="uploadMethod"
                                value={uploadMethod}
                                onChange={setUploadMethod}
                                options={[
                                    { value: 'url', label: 'Adresse (URL) d\'une image', hint: 'Recommandé : rien à configurer.' },
                                    { value: 'file', label: 'Fichier depuis l\'ordinateur', hint: 'JPG, PNG ou WEBP, 5 Mo maximum. Nécessite le stockage S3.' },
                                ]}
                            />
                            {uploadMethod === 'url' ? (
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://exemple.com/image.jpg"
                                    aria-label="URL de l'image"
                                    className="adm-input"
                                    required
                                />
                            ) : (
                                <input
                                    type="file"
                                    name="imageFile"
                                    onChange={handleFileChange}
                                    className="adm-input py-2"
                                    accept="image/*"
                                    aria-label="Fichier image"
                                    required
                                />
                            )}
                        </fieldset>

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowAddModal(false)} className="adm-btn adm-btn-secondary">Annuler</button>
                            <button type="submit" className="adm-btn adm-btn-primary" disabled={uploading}>
                                {uploading ? 'Envoi en cours…' : 'Ajouter le produit'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <div className="adm-card overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="adm-th w-10">
                                <input
                                    type="checkbox"
                                    aria-label="Tout sélectionner"
                                    onChange={handleSelectAll}
                                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                />
                            </th>
                            <th className="adm-th">Produit</th>
                            <th className="adm-th">Vendeur</th>
                            <th className="adm-th text-right">Prix</th>
                            <th className="adm-th text-right">Stock</th>
                            <th className="adm-th">Statut</th>
                            <th className="adm-th"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <LoadingRows colSpan={COLUMNS} />
                        ) : filteredProducts.length === 0 ? (
                            <EmptyRow colSpan={COLUMNS}>
                                {products.length === 0 ? 'Aucun produit pour le moment.' : 'Aucun produit ne correspond à cette recherche.'}
                            </EmptyRow>
                        ) : filteredProducts.map((product) => (
                            <tr key={product.id} className={selectedProducts.includes(product.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                                <td className="adm-td">
                                    <input
                                        type="checkbox"
                                        aria-label={`Sélectionner ${product.name}`}
                                        checked={selectedProducts.includes(product.id)}
                                        onChange={(e) => handleSelectOne(e, product.id)}
                                    />
                                </td>
                                <td className="adm-td">
                                    <div className="flex items-center gap-3 min-w-[14rem]">
                                        {product.images && product.images.length > 0 ? (
                                            <img src={product.images[0]} alt="" className="w-12 h-12 shrink-0 object-cover rounded-lg bg-gray-100" loading="lazy" />
                                        ) : (
                                            <div className="w-12 h-12 shrink-0 rounded-lg bg-gray-100" aria-hidden="true" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-semibold leading-snug line-clamp-2">{product.name}</p>
                                            <p className="text-xs text-gray-500">{categoryName(product.category) || 'Sans catégorie'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="adm-td">{product.sellerName}</td>
                                <td className="adm-td text-right whitespace-nowrap">
                                    {product.promoPrice && product.promoPrice > 0 ? (
                                        <>
                                            <span className="price text-red-600">{formatPrice(product.promoPrice)}</span>
                                            <span className="block text-xs text-gray-500 line-through">{formatPrice(product.price)}</span>
                                        </>
                                    ) : (
                                        <span className="price">{formatPrice(product.price)}</span>
                                    )}
                                </td>
                                <td className={`adm-td text-right tabular-nums ${product.stock > 0 ? '' : 'text-red-600 font-semibold'}`}>{product.stock}</td>
                                <td className="adm-td"><StatusBadge status={product.status} /></td>
                                <td className="adm-td whitespace-nowrap text-right">
                                    <button onClick={() => setEditingProduct(product)} className="adm-link !min-h-0">Modifier</button>
                                    <button onClick={() => handleDeleteProduct(product.id)} className="adm-link-danger !min-h-0 ml-4">Supprimer</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductManagement;
