import React from 'react';
import SellerHeader from './SellerHeader';
import { MediaLibraryPage } from '../admin/MediaLibrary';

/** Médiathèque de la boutique : ses photos, réutilisables d'une fiche produit à l'autre. */
const SellerMedia = () => (
  <MediaLibraryPage
    imagesOnly
    header={(
      <SellerHeader
        title="Médiathèque"
        description="Les photos de votre boutique. Téléversez-les une fois, puis choisissez-les dans vos fiches produits. Glissez des photos sur la page pour les ajouter."
      />
    )}
  />
);

export default SellerMedia;
