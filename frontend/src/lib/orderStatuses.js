// États d'une commande : même liste que le serveur (backend/order_flow.py).

export const ORDER_STATUSES = [
  { value: 'received', label: 'Commande reçue', labelEn: 'Order received' },
  { value: 'confirmed', label: 'Commande confirmée', labelEn: 'Order confirmed' },
  { value: 'payment_pending', label: 'Paiement en attente', labelEn: 'Payment pending' },
  { value: 'payment_confirmed', label: 'Paiement confirmé', labelEn: 'Payment confirmed' },
  { value: 'preparing', label: 'Préparation du colis', labelEn: 'Preparing' },
  { value: 'shipped', label: 'Expédiée', labelEn: 'Shipped' },
  { value: 'out_for_delivery', label: 'Livraison en cours', labelEn: 'Out for delivery' },
  { value: 'delivered', label: 'Livrée', labelEn: 'Delivered' },
  { value: 'cancelled', label: 'Annulée', labelEn: 'Cancelled' },
  { value: 'refunded', label: 'Remboursée', labelEn: 'Refunded' },
];

// Statuts utilisés avant la phase 4
const LEGACY = { pending: 'received', processing: 'preparing' };

// Étape suivante possible pour un vendeur (un administrateur peut corriger librement)
const TRANSITIONS = {
  received: ['confirmed', 'cancelled'],
  confirmed: ['payment_pending', 'preparing', 'cancelled'],
  payment_pending: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['preparing', 'refunded'],
  preparing: ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

// Paiement pas encore intégré : ces étapes ne sont pas proposées aux vendeurs
export const PAYMENT_STEPS = ['payment_pending', 'payment_confirmed', 'refunded'];

export const normalizeOrderStatus = (status) => LEGACY[status] || status || 'received';

export const orderStatusLabel = (status, language = 'fr') => {
  const found = ORDER_STATUSES.find((s) => s.value === normalizeOrderStatus(status));
  if (!found) return status || '';
  return language === 'en' ? found.labelEn : found.label;
};

/** Statuts proposés dans la liste déroulante d'une commande (le statut actuel en premier). */
export const nextOrderStatuses = (status, { isAdmin = false } = {}) => {
  const current = normalizeOrderStatus(status);
  const next = isAdmin
    ? ORDER_STATUSES.map((s) => s.value).filter((s) => s !== current)
    : (TRANSITIONS[current] || []).filter((s) => !PAYMENT_STEPS.includes(s));
  return [current, ...next];
};

/** Couleur du badge selon l'avancement. */
export const orderStatusTone = (status) => {
  const s = normalizeOrderStatus(status);
  if (s === 'delivered') return 'bg-green-100 text-green-800';
  if (s === 'cancelled' || s === 'refunded') return 'bg-gray-100 text-gray-700';
  if (s === 'received' || s === 'payment_pending') return 'bg-yellow-100 text-yellow-900';
  return 'bg-purple-100 text-purple-900';
};
