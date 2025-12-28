import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';
import { openWhatsApp } from '../../lib/utils';
import { translations } from '../../lib/translations';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerShop = (props) => {
    const { id: sellerId } = useParams();
    const { language, addToCart } = props;
    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const t = translations[language];

    useEffect(() => {
        const fetchSellerAndProducts = async () => {
            setLoading(true);
            try {
                // Fetch seller details
                const sellerResponse = await fetch(`${API_BASE_URL}/sellers/${sellerId}`);
                if (!sellerResponse.ok) {
                    throw new Error('Seller not found');
                }
                const sellerData = await sellerResponse.json();
                setSeller(sellerData);

                // Fetch seller products
                const productsResponse = await fetch(`${API_BASE_URL}/products?seller_id=${sellerId}`);
                if (!productsResponse.ok) {
                    throw new Error('Failed to fetch products');
                }
                const productsData = await productsResponse.json();
                
                // Adapt products for ProductCard
                const adaptedProducts = productsData.map(p => ({
                    ...p,
                    name: { [language]: p.name },
                    description: { [language]: p.description },
                    image: p.images && p.images.length > 0 ? p.images[0] : process.env.PUBLIC_URL + '/images/logo-nengoo.png',
                    inStock: p.stock > 0,
                    reviews: p.reviewsCount || 0,
                    rating: p.rating || 0,
                }));
                setProducts(adaptedProducts);

            } catch (err) {
                console.error("Error fetching seller shop data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (sellerId) {
            fetchSellerAndProducts();
        }
    }, [sellerId, language]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header {...props} />
                <div className="container mx-auto px-4 py-16 text-center">
                    <p className="text-xl text-gray-600">Chargement de la boutique...</p>
                </div>
                <Footer language={language} />
            </div>
        );
    }

    if (error || !seller) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header {...props} />
                <div className="container mx-auto px-4 py-16 text-center">
                    <h2 className="text-2xl font-bold mb-4">Boutique introuvable</h2>
                    <p className="text-gray-600 mb-8">{error || "Le vendeur demandé n'existe pas."}</p>
                </div>
                <Footer language={language} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Helmet>
                <title>{seller.businessName} - Nengoo</title>
                <meta name="description" content={`Découvrez les produits de ${seller.businessName} sur Nengoo.`} />
            </Helmet>
            
            <Header {...props} />

            <div className="container mx-auto px-4 py-8">
                {/* Seller Header / Profile Card */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-12">
                    <div className="h-32 bg-purple-600"></div>
                    <div className="px-8 pb-8">
                        <div className="relative flex justify-between items-end -mt-12 mb-6">
                            <div className="flex items-end">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500 overflow-hidden">
                                    {seller.logoUrl ? (
                                        <img src={seller.logoUrl} alt={seller.businessName} className="w-full h-full object-cover" />
                                    ) : (
                                        seller.businessName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="ml-4 mb-1">
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{seller.businessName}</h1>
                                    <p className="text-gray-600">{seller.name}</p>
                                </div>
                            </div>
                            <div className="hidden md:flex space-x-3">
                                {seller.whatsapp && (
                                    <button
                                        onClick={() => openWhatsApp(seller.whatsapp)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
                                    >
                                        <span>📱</span>
                                        <span>Contacter sur WhatsApp</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 max-md:text-left">
                                <h3 className="text-lg font-semibold mb-2">À propos</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    {seller.description || "Aucune description disponible."}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {seller.address && (
                                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                            📍 {seller.address}, {seller.city}
                                        </span>
                                    )}
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                        📦 {products.length} Produits
                                    </span>
                                </div>
                            </div>
                            
                            {/* Mobile Contact Button */}
                            <div className="md:hidden mt-4">
                                {seller.whatsapp && (
                                    <button
                                        onClick={() => openWhatsApp(seller.whatsapp)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                                    >
                                        <span>📱</span>
                                        <span>Contacter sur WhatsApp</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                <h2 className="text-2xl font-bold mb-6">Produits de la boutique</h2>
                
                {products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map(product => (
                            <ProductCard 
                                key={product.id} 
                                product={product} 
                                language={language} 
                                addToCart={addToCart} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <p className="text-gray-500 text-lg">Ce vendeur n'a pas encore de produits en ligne.</p>
                    </div>
                )}
            </div>

            <Footer language={language} />
        </div>
    );
};

export default SellerShop;
