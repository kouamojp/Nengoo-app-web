import React from 'react';
import SellerHeader from './SellerHeader';
import ChatInbox from '../chat/ChatInbox';
import { useChatUnread } from '../../lib/chat';

/** Messages des clients (backend/routers/chat.py). */
const SellerMessages = ({ user }) => {
  const unread = useChatUnread(user, 30000);
  return (
    <div>
      <SellerHeader
        title="Messages clients"
        description={unread > 0
          ? `${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}`
          : 'Les questions de vos clients sur vos produits.'}
      />
      <ChatInbox
        user={user}
        emptyText="Aucune conversation. Quand un client vous écrit depuis une fiche produit ou votre boutique, son message arrive ici."
      />
    </div>
  );
};

export default SellerMessages;
