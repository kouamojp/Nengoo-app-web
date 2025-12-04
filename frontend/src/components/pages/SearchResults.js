
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SearchResults = (props) => {
  const { language, addToCart, searchQuery } = props;
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || searchQuery;

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setLoading(false);
        setSearchResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/product?search=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const adaptedProducts = data.map(p => ({
            ...p,
            name: { [language]: p.name },
            description: { [language]: p.description },
            image: p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/300',
            inStock: p.stock > 0,
            reviews: p.reviewsCount || 0,
            rating: p.rating || 0,
          }));
        setSearchResults(adaptedProducts);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, language]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Résultats de recherche</h1>
          {query && (
            <p className="text-gray-600">
              {loading ? 'Recherche en cours...' : `${searchResults.length} résultat(s) pour "<strong>${query}</strong>"`}
            </p>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">
            <p>Erreur: {error}</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {searchResults.map(product => (
              <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
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
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default SearchResults;
