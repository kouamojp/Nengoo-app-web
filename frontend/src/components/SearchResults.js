
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { translations, getImageUrl } from './common';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import { getPublicProducts } from '../services/api';

// Search Results Component
export const SearchResults = (props) => {
  const { language, addToCart, searchQuery } = props;
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || searchQuery;

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSearchResults();
  }, [query]);

  const loadSearchResults = async () => {
    if (!query || query.trim() === '') {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const productsData = await getPublicProducts({ search: query.trim() });

      // Adapter les données pour ProductCard
      const adaptedProducts = productsData.map(product => ({
        id: product.id,
        name: {
          fr: product.name,
          en: product.name
        },
        category: product.category,
        price: product.price,
        image: product.images && product.images.length > 0
          ? getImageUrl(product.images[0])
          : '/placeholder-product.jpg',
        rating: 4.5,
        reviews: 0,
        inStock: product.stock > 0,
        sellerWhatsApp: product.seller?.whatsapp || '',
        description: product.description,
        unit: product.unit,
        stock: product.stock,
        seller: product.seller
      }));

      setSearchResults(adaptedProducts);
    } catch (error) {
      console.error('Error loading search results:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold mb-2">Recherche en cours...</h3>
            <p className="text-gray-600">
              Recherche de produits pour "<strong>{query}</strong>"
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Résultats de recherche</h1>
              <p className="text-gray-600">
                {searchResults.length} résultat(s) pour "<strong>{query}</strong>"
              </p>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResults.map(product => (
                  <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} user={props.user} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">Aucun résultat trouvé</h3>
                <p className="text-gray-600 mb-8">
                  Aucun produit ne correspond à votre recherche "<strong>{query}</strong>".
                </p>
                <Link
                  to="/catalog"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Parcourir tous les produits
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default SearchResults;
