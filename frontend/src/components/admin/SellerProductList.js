import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const formatPrice = (price) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
}).format(price || 0);

const getLocalizedValue = (field, lang = 'fr') => {
    if (typeof field === 'object' && field !== null && field[lang]) {
        return field[lang];
    }
    return field;
};

const SellerProductList = ({ user, setUser }) => {
    const { sellerId } = useParams();
    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const allowed = user && ['super_admin', 'admin'].includes(user.role);

    useEffect(() => {
        const fetchSellerProducts = async () => {
            if (!allowed) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Fetch seller details
                const sellerRes = await fetch(`${API_BASE_URL}/sellers/${sellerId}`, {
                    headers: { 'X-Admin-Role': user.role }
                });
                if (!sellerRes.ok) throw new Error('Failed to fetch seller details');
                const sellerData = await sellerRes.json();
                setSeller(sellerData);

                // Fetch seller products
                const productsRes = await fetch(`${API_BASE_URL}/sellers/${sellerId}/products`, {
                    headers: { 'X-Admin-Role': user.role }
                });
                if (!productsRes.ok) throw new Error('Failed to fetch seller products');
                const productsData = await productsRes.json();
                setProducts(productsData);

            } catch (error) {
                console.error("Error fetching seller products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSellerProducts();
    }, [sellerId, user, allowed]);

    if (!allowed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="adm-card max-w-md w-full p-8 text-left">
                    <h1 className="adm-title">Accès réservé</h1>
                    <p className="adm-subtitle mb-6">Cette page est réservée aux administrateurs.</p>
                    <Link to="/admin/login" className="adm-btn adm-btn-primary">Se connecter</Link>
                </div>
            </div>
        );
    }

    // Produits regroupés par jour d'ajout, du plus récent au plus ancien
    const groupedProducts = [...products]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .reduce((acc, product) => {
            const date = new Date(product.createdAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            (acc[date] = acc[date] || []).push(product);
            return acc;
        }, {});

    return (
        <AdminLayout
            user={user}
            setUser={setUser}
            active="sellers"
            title={seller ? `Produits de ${seller.businessName}` : 'Produits du vendeur'}
            description={seller && !loading ? `${products.length} produit${products.length > 1 ? 's' : ''}, du plus récent au plus ancien.` : undefined}
            actions={<Link to="/admin/dashboard?section=sellers" className="adm-btn adm-btn-secondary">Tous les vendeurs</Link>}
        >
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-64 rounded-xl loading-shimmer" />)}
                </div>
            ) : !seller ? (
                <p className="adm-card p-5 text-gray-700">Ce vendeur est introuvable. Il a peut-être été supprimé.</p>
            ) : products.length === 0 ? (
                <p className="adm-card p-5 text-gray-700">Ce vendeur n'a encore ajouté aucun produit.</p>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedProducts).map(([date, productsOnDate]) => (
                        <section key={date}>
                            <h2 className="flex items-baseline gap-2 text-lg font-bold mb-3">
                                {date}
                                <span className="text-sm font-normal text-gray-500">{productsOnDate.length} produit{productsOnDate.length > 1 ? 's' : ''}</span>
                            </h2>
                            <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {productsOnDate.map(product => (
                                    <li key={product.id} className="adm-card overflow-hidden flex flex-col">
                                        <div className="aspect-square bg-gray-100">
                                            {product.images && product.images.length > 0 && (
                                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                                            )}
                                        </div>
                                        <div className="p-3 sm:p-4 flex flex-col flex-1">
                                            <p className="font-bold leading-snug line-clamp-2">{getLocalizedValue(product.name)}</p>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{getLocalizedValue(product.description)}</p>
                                            <p className="price text-lg text-purple-800 mt-auto pt-2">{formatPrice(product.price)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
};

export default SellerProductList;
