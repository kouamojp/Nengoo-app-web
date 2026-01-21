import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerProductList = ({ user }) => {
    const { sellerId } = useParams();
    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSellerProducts = async () => {
            if (!user || !['super_admin', 'admin'].includes(user.role)) {
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
    }, [sellerId, user]);

    if (loading) {
        return <p>Chargement des produits du vendeur...</p>;
    }

    if (!user || !['super_admin', 'admin'].includes(user.role)) {
        return <p>Accès non autorisé.</p>;
    }
    
    if (!seller) {
        return <p>Vendeur non trouvé.</p>;
    }

    const groupedProducts = products.reduce((acc, product) => {
        const date = new Date(product.createdAt).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(product);
        return acc;
    }, {});


    const getLocalizedValue = (field, lang = 'fr') => {
        if (typeof field === 'object' && field !== null && field[lang]) {
            return field[lang];
        }
        return field;
    };


    return (
        <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold mb-12">Produits de {seller.businessName}</h1>
            {Object.keys(groupedProducts).length > 0 ? (
                Object.entries(groupedProducts).map(([date, productsOnDate]) => (
                    <div key={date} className="mb-6">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-3">{date} - ({productsOnDate.length})</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {productsOnDate.map(product => (
                                <div key={product.id} className="border rounded-lg p-4">
                                    {product.images && product.images.length > 0 && (
                                        <img src={product.images[0]} alt={getLocalizedValue(product.name)} className="w-full h-48 object-cover mb-4 rounded-lg" />
                                    )}
                                    <p className="font-bold">{getLocalizedValue(product.name)}</p>
                                    <p className="text-sm text-gray-600 mb-2">{getLocalizedValue(product.description)}</p>
                                    <p className="font-semibold text-lg">{new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(product.price)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <p>Ce vendeur n'a aucun produit.</p>
            )}
        </div>
    );
};

export default SellerProductList;
