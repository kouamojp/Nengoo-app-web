
import React, { useState, useEffect } from 'react';
import { notify, confirmAction } from './adminFeedback';
import { SectionHeader, Toolbar, SearchInput, SelectionBar, StatusBadge, EmptyRow, LoadingRows, Modal, Field, DateSortSelect, sortByDate } from './AdminUI';
import { categorySelectOptions, categoryPath } from '../../lib/categories';
import ProductDetailsFields, { ProductKindField } from '../seller/ProductDetailsFields';
import { productFormError, productPayload, productDetailsPayload, withSpecList, isMeal, isWhatsappOnly, kindLabel, listingText, stockLabel, withKind } from '../../lib/productRules';
import { numberFormat } from '../../lib/numberFormat';
import { ImagePicker } from './MediaLibrary';

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
    const [dateOrder, setDateOrder] = useState('newest');
    const [featuredOnly, setFeaturedOnly] = useState(false);
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
        images: [],
        brand: '',
        condition: '',
        specList: [],
    });

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
            const restaurant = Boolean(selectedSeller?.restaurant);
            // Restaurant : « Plat » par défaut ; un plat n'est possible que chez un restaurant
            const kind = restaurant && newProductData.kind === 'product' ? 'meal'
                : !restaurant && isMeal(newProductData) ? 'product' : newProductData.kind;
            setNewProductData({
                ...withKind(newProductData, kind || 'product'),
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
        const formError = productFormError(editingProduct, 1, products.find(p => p.id === editingProduct.id));
        if (formError) {
            notify(formError, 'error');
            return;
        }

        setUploading(true);
        try {
            const images = (editingProduct.images || []).filter(Boolean);
            const previous = (products.find(p => p.id === editingProduct.id)?.images || []).filter(Boolean);
            const imagesChanged = JSON.stringify(images) !== JSON.stringify(previous);

            const updatedProductData = {
                name: editingProduct.name,
                description: editingProduct.description,
                price: parseFloat(editingProduct.price),
                promoPrice: Number(editingProduct.promoPrice) || null,
                ...productDetailsPayload(editingProduct),
                stock: parseInt(editingProduct.stock, 10),
                category: editingProduct.category,
                status: editingProduct.status,
                ...(imagesChanged && { images }),
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
            notify('Produit mis à jour avec succès.', 'success');

        } catch (error) {
            console.error('Error updating product:', error);
            notify(error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        // Image facultative : sans image, le logo de la boutique s'affiche
        const formError = productFormError(newProductData, 1);
        if (formError) {
            notify(formError, 'error');
            return;
        }

        setUploading(true);
        try {
            const finalSellerId = newProductData.sellerId || (user ? user.id : 'admin_default');
            const finalSellerName = newProductData.sellerName || (user ? user.name : 'Admin');

            const productToCreate = {
                ...productPayload(newProductData),
                sellerId: finalSellerId,
                sellerName: finalSellerName,
                images: (newProductData.images || []).filter(Boolean),
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
                name: '', description: '', category: '', price: 0, promoPrice: 0, sellerId: '', sellerName: '', stock: 0, images: [],
                brand: '', condition: '', specList: [],
            });
            notify('Produit ajouté avec succès.', 'success');
        } catch (error) {
            console.error('Error adding product:', error);
            notify(error.message, 'error');
        } finally {
            setUploading(false);
        }
    };
    
    const formatPrice = (price) => {
        return numberFormat('fr-FR', {
          style: 'currency',
          currency: 'XAF',
          minimumFractionDigits: 0,
        }).format(price);
      };

    const filteredProducts = sortByDate(products, dateOrder, (p) => p.createdAt).filter(product => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            categoryPath(categories, product.category).toLowerCase().includes(query) ||
            product.sellerName.toLowerCase().includes(query)
        );

        // Filtrer par vendeur si un vendeur est sélectionné
        const matchesSeller = selectedSellerId === '' || product.sellerId === selectedSellerId;

        return matchesSearch && matchesSeller && (!featuredOnly || product.featured);
    });

    // « À la une » de l'accueil : en tête de la section, avant le classement automatique
    const toggleFeatured = async (product) => {
        const featured = !product.featured;
        try {
            const response = await fetch(`${API_BASE_URL}/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featured }),
            });
            if (!response.ok) throw new Error();
            setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, featured } : p)));
            notify(featured ? `« ${product.name.trim()} » est à la une de l'accueil.` : `« ${product.name.trim()} » n'est plus mis en avant.`);
        } catch {
            notify("La mise à la une n'a pas été enregistrée.", 'error');
        }
    };

    // Les produits référencent leur catégorie par id (comme le formulaire vendeur et le catalogue public)
    const categoryName = (categoryId) => categoryPath(categories, categoryId);

    // Options de catégorie ; une catégorie inconnue est conservée pour ne pas être écrasée à l'enregistrement
    const categoryOptions = (currentValue) => (
        <>
            {currentValue && !categoryName(currentValue) && (
                <option value={currentValue}>{currentValue} (catégorie supprimée)</option>
            )}
            {categorySelectOptions(categories).map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
        </>
    );

    const closeEditModal = () => setEditingProduct(null);

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
                <DateSortSelect value={dateOrder} onChange={setDateOrder} />
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} />
                    À la une ({products.filter((p) => p.featured).length})
                </label>
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
                <Modal title={isMeal(editingProduct) ? "Modifier le plat" : "Modifier le produit"} onClose={closeEditModal}>
                    <form onSubmit={handleUpdateProduct} className="space-y-4">
                        <ProductKindField value={editingProduct} onChange={setEditingProduct}
                            restaurant={Boolean(sellers.find(s => s.id === editingProduct.sellerId)?.restaurant)} />
                        <Field label={listingText(editingProduct).name}>
                            <input type="text" name="name" value={editingProduct.name} onChange={handleEditInputChange} className="adm-input" />
                        </Field>
                        <Field label="Description">
                            <textarea name="description" value={editingProduct.description} onChange={handleEditInputChange} className="adm-input" rows="3" />
                        </Field>

                        <ImagePicker
                            value={editingProduct.images || []}
                            onChange={(images) => setEditingProduct((p) => ({ ...p, images }))}
                            label={listingText(editingProduct).photos || 'Photos'}
                        />

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
                            {!isWhatsappOnly(editingProduct) && (
                                <Field label={stockLabel(editingProduct)}>
                                    <input type="number" name="stock" value={editingProduct.stock} onChange={handleEditInputChange} min="0" className="adm-input" />
                                </Field>
                            )}
                        </div>
                        <ProductDetailsFields value={editingProduct} onChange={setEditingProduct} />
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
                <Modal title={isMeal(newProductData) ? "Ajouter un plat" : "Ajouter un produit"} onClose={() => setShowAddModal(false)}>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        {/* En premier : le vendeur décide des types d'annonce possibles (plat pour un restaurant) */}
                        <Field label="Vendeur" hint="Sans vendeur choisi, le produit est attribué à l'administration.">
                            <select name="sellerId" value={newProductData.sellerId} onChange={handleInputChange} className="adm-input">
                                <option value="">Administration</option>
                                {sellers.map((seller) => (
                                    <option key={seller.id} value={seller.id}>
                                        {seller.businessName} ({seller.city}){seller.restaurant ? ' · Restaurant' : ''}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <ProductKindField value={newProductData} onChange={setNewProductData}
                            restaurant={Boolean(sellers.find(s => s.id === newProductData.sellerId)?.restaurant)} />
                        <Field label={listingText(newProductData).name} required>
                            <input type="text" name="name" value={newProductData.name} onChange={handleInputChange} placeholder={listingText(newProductData).namePlaceholder || "Ex. : Smartphone Samsung Galaxy"} className="adm-input" required />
                        </Field>
                        <Field label="Description" required hint="Au moins 20 caractères.">
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
                            {!isWhatsappOnly(newProductData) && (
                                <Field label={stockLabel(newProductData)} required>
                                    <input type="number" name="stock" value={newProductData.stock} onChange={handleInputChange} min="0" className="adm-input" required />
                                </Field>
                            )}
                        </div>
                        <ProductDetailsFields value={newProductData} onChange={setNewProductData} />

                        <ImagePicker
                            value={newProductData.images}
                            onChange={(images) => setNewProductData((p) => ({ ...p, images }))}
                            label={`${listingText(newProductData).photos || 'Photos'} (facultatives)`}
                        />

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
                                            {product.featured && (
                                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-yellow-300 text-purple-950 text-xs font-semibold">À la une</span>
                                            )}
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
                                <td className={`adm-td text-right tabular-nums ${isWhatsappOnly(product) || product.stock > 0 ? '' : 'text-red-600 font-semibold'}`}>
                                    {kindLabel(product) && <span className="text-sm text-purple-800 font-semibold">{kindLabel(product)}{isWhatsappOnly(product) ? '' : ' · '}</span>}
                                    {!isWhatsappOnly(product) && product.stock}
                                </td>
                                <td className="adm-td"><StatusBadge status={product.status} /></td>
                                <td className="adm-td whitespace-nowrap text-right">
                                    <button onClick={() => toggleFeatured(product)} className="adm-link !min-h-0 mr-4">
                                        {product.featured ? 'Retirer de la une' : 'Mettre à la une'}
                                    </button>
                                    <button onClick={() => setEditingProduct(withSpecList(product))} className="adm-link !min-h-0">Modifier</button>
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
