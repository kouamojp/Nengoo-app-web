import React from 'react';
import SellerHeader from './SellerHeader';
import PromoCodesManager from '../promo/PromoCodesManager';

/** Codes promo de la boutique : valables sur ses seuls produits, à sa charge. */
const SellerPromoCodes = () => (
  <PromoCodesManager
    header={(count, action) => (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SellerHeader
          title="Codes promo"
          description="Offrez une réduction à saisir au moment de commander. Elle ne s'applique qu'à vos produits et reste à votre charge : le client paie le prix réduit."
        />
        <div className="shrink-0">{action}</div>
      </div>
    )}
  />
);

export default SellerPromoCodes;
