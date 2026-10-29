import React from 'react';

// Grille de cartes fantômes affichée pendant le chargement des produits.
const ProductGridSkeleton = ({ count = 8, className = 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5', label }) => (
  <div className={className} aria-busy="true" aria-label={label}>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="aspect-square loading-shimmer" />
        <div className="p-4 space-y-2">
          <div className="h-4 w-4/5 rounded loading-shimmer" />
          <div className="h-5 w-1/2 rounded loading-shimmer" />
        </div>
      </div>
    ))}
  </div>
);

export default ProductGridSkeleton;
