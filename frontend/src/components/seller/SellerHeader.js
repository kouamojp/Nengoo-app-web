import React from 'react';

/**
 * En-tête de section de l'espace vendeur (titre, description, actions),
 * sur le modèle de SectionHeader dans l'administration.
 */
const SellerHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="adm-title">{title}</h1>
      {description && <p className="adm-subtitle">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export default SellerHeader;
