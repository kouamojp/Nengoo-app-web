import React from 'react';
import SellerHeader from './SellerHeader';
import UserSupportThread from '../support/UserSupportThread';

// Conversation du vendeur avec l'équipe Nengoo (validation, paiements, litiges…)
const SellerSupport = ({ user }) => (
  <div>
    <SellerHeader
      title="Équipe Nengoo"
      description="Écrivez à l'équipe : compte, produits, commandes, paiements. Les réponses arrivent ici et dans vos notifications."
    />
    <section className="adm-card overflow-hidden" aria-label="Conversation avec l'équipe Nengoo">
      <UserSupportThread user={user} className="h-[calc(100vh-16rem)] min-h-[24rem]" />
    </section>
  </div>
);

export default SellerSupport;
