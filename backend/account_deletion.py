"""
Suppression d'un compte acheteur ou vendeur à la demande de son titulaire
(POST /api/account/delete), exigée par les stores pour l'application mobile.

Ce qui est effacé et ce qui est gardé suit la politique de confidentialité
(docs/privacy-policy.md, sections 5 et 8) : le compte, son profil, sa boutique,
ses produits, ses notifications et ses conversations disparaissent ; les
commandes restent pour la comptabilité, sans les coordonnées de l'acheteur.
"""

DELETED_NAME = "Compte supprimé"


async def _delete_conversations(db, field: str, user_id: str) -> None:
    conversations = await db.conversations.find({field: user_id}).to_list(None)
    ids = [c["id"] for c in conversations if c.get("id")]
    if ids:
        await db.messages.delete_many({"conversation_id": {"$in": ids}})
    await db.conversations.delete_many({field: user_id})


async def erase_buyer(db, buyer_id: str) -> None:
    await db.users.delete_one({"id": buyer_id, "type": "buyer"})
    await db.notifications.delete_many({"recipient_id": buyer_id, "recipient_type": "buyer"})
    await db.interactions.delete_many({"userId": buyer_id})
    await _delete_conversations(db, "buyer_id", buyer_id)
    # Les avis restent visibles sur les produits, sans nom
    await db.reviews.update_many({"buyerId": buyer_id}, {"$set": {"buyerName": DELETED_NAME}})
    # Commandes gardées (obligation comptable), coordonnées retirées
    await db.orders.update_many(
        {"buyerId": buyer_id},
        {"$set": {
            "buyerName": DELETED_NAME,
            "buyerWhatsapp": None,
            "shippingPhone": None,
            "shippingAddress": None,
        }},
    )


async def erase_seller(db, seller_id: str) -> None:
    await db.sellers.delete_one({"id": seller_id})
    await db.products.delete_many({"sellerId": seller_id})
    await db.notifications.delete_many({"recipient_id": seller_id, "recipient_type": "seller"})
    await db.whatsapp_clicks.delete_many({"sellerId": seller_id})
    await _delete_conversations(db, "seller_id", seller_id)
