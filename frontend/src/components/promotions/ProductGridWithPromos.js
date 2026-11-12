import React from 'react';
import { PromoBanner, useFeedPromotions } from './PromoSlot';
import { interleavePromotions } from '../../lib/promotions';

/**
 * Grille de produits avec des bannières « entre les produits » : une sur
 * toute la largeur tous les 12 produits, 4 au plus, chaque campagne une seule
 * fois (backend/routers/ads.py, emplacement « feed »). Sans campagne en cours,
 * la grille est identique à une grille simple.
 */
const ProductGridWithPromos = ({ products, renderProduct, categories = [], language = 'fr', className }) => {
  const promotions = useFeedPromotions(categories);
  return (
    <div className={className}>
      {interleavePromotions(products, promotions).map((item) => (
        item.type === 'product'
          ? <React.Fragment key={item.product.id}>{renderProduct(item.product)}</React.Fragment>
          : (
            <PromoBanner
              key={`promo-${item.promotion.id}`}
              promotion={item.promotion}
              placement="feed"
              language={language}
              className="col-span-full my-1 sm:my-2"
            />
          )
      ))}
    </div>
  );
};

export default ProductGridWithPromos;
