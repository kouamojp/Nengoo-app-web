
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { translations, mockProducts } from './common';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';

// Search Results Component
export const SearchResults = (props) => {
  const { language, addToCart, searchQuery } = props;
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || searchQuery;
  
  const searchResults = mockProducts.filter(product =>
    product.name[language].toLowerCase().includes(query.toLowerCase()) ||
    product.description[language].toLowerCase().includes(query.toLowerCase()) ||
    translations[language][product.category].toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Résultats de recherche</h1>
          <p className="text-gray-600">
            {searchResults.length} résultat(s) pour "<strong>{query}</strong>"
          </p>
        </div>
        
        {searchResults.length > 0 ? (
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
