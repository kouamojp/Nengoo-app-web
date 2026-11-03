"""
États d'une commande (cahier des charges, phase 4) et passages autorisés.

Les états de paiement existent déjà pour l'intégration du paiement mobile ;
en attendant, une commande peut passer directement de « confirmée » à
« préparation du colis ».
"""
from typing import Optional

STATUSES = {
    "received": "Commande reçue",
    "confirmed": "Commande confirmée",
    "payment_pending": "Paiement en attente",
    "payment_confirmed": "Paiement confirmé",
    "preparing": "Préparation du colis",
    "shipped": "Expédiée",
    "out_for_delivery": "Livraison en cours",
    "delivered": "Livrée",
    "cancelled": "Annulée",
    "refunded": "Remboursée",
}

# Statuts utilisés avant la phase 4
LEGACY = {"pending": "received", "processing": "preparing"}

# Étape suivante possible pour un vendeur ; un administrateur peut corriger librement
TRANSITIONS = {
    "received": {"confirmed", "cancelled"},
    "confirmed": {"payment_pending", "preparing", "cancelled"},
    "payment_pending": {"payment_confirmed", "cancelled"},
    "payment_confirmed": {"preparing", "refunded"},
    "preparing": {"shipped", "out_for_delivery", "delivered", "cancelled"},
    "shipped": {"out_for_delivery", "delivered", "cancelled"},
    "out_for_delivery": {"delivered", "cancelled"},
    "delivered": {"refunded"},
    "cancelled": set(),
    "refunded": set(),
}

# Une commande annulée rend son stock ; ces états-là ne le retiennent plus
RELEASES_STOCK = {"cancelled"}


def normalize_status(status: Optional[str]) -> str:
    status = (status or "received").strip()
    return LEGACY.get(status, status)


def status_label(status: Optional[str]) -> str:
    return STATUSES.get(normalize_status(status), status or "")


def check_transition(current: Optional[str], new: str, is_admin: bool) -> Optional[str]:
    """Message d'erreur si le passage n'est pas permis, sinon None."""
    current, new = normalize_status(current), normalize_status(new)
    if new not in STATUSES:
        return "Statut de commande inconnu."
    if new == current or is_admin:
        return None
    if new not in TRANSITIONS.get(current, set()):
        allowed = ", ".join(STATUSES[s] for s in sorted(TRANSITIONS.get(current, set()), key=list(STATUSES).index))
        return (f"Une commande « {STATUSES.get(current, current)} » ne peut pas passer à « {STATUSES[new]} »."
                + (f" Étapes possibles : {allowed}." if allowed else ""))
    return None
