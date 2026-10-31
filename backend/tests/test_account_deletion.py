"""Ce que la suppression d'un compte efface et ce qu'elle garde.

Lancer depuis backend/ :  python -m pytest tests/test_account_deletion.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from account_deletion import DELETED_NAME, erase_buyer, erase_seller  # noqa: E402


def _match(doc, query):
    for key, cond in query.items():
        if isinstance(cond, dict) and "$in" in cond:
            if doc.get(key) not in cond["$in"]:
                return False
        elif doc.get(key) != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _length):
        return list(self.docs)


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    def find(self, query):
        return _Cursor([d for d in self.docs if _match(d, query)])

    async def delete_one(self, query):
        for d in self.docs:
            if _match(d, query):
                self.docs.remove(d)
                return

    async def delete_many(self, query):
        self.docs = [d for d in self.docs if not _match(d, query)]

    async def update_many(self, query, update):
        for d in self.docs:
            if _match(d, query):
                d.update(update["$set"])


class FakeDb:
    def __init__(self, **collections):
        for name in ["users", "sellers", "products", "orders", "reviews", "notifications",
                     "interactions", "conversations", "messages", "whatsapp_clicks"]:
            setattr(self, name, FakeCollection(collections.get(name)))


def _db():
    return FakeDb(
        users=[{"id": "buyer_1", "type": "buyer"}, {"id": "buyer_2", "type": "buyer"}],
        sellers=[{"id": "seller_1"}, {"id": "seller_2"}],
        products=[{"id": "p1", "sellerId": "seller_1"}, {"id": "p2", "sellerId": "seller_2"}],
        orders=[{"id": "o1", "buyerId": "buyer_1", "sellerId": "seller_1", "buyerName": "Awa",
                 "buyerWhatsapp": "+237690703689", "shippingPhone": "+237690703689",
                 "shippingAddress": "Akwa", "totalAmount": 15000}],
        reviews=[{"id": "r1", "buyerId": "buyer_1", "buyerName": "Awa", "rating": 5}],
        notifications=[{"recipient_id": "buyer_1", "recipient_type": "buyer"},
                       {"recipient_id": "seller_1", "recipient_type": "seller"}],
        interactions=[{"userId": "buyer_1"}, {"userId": "buyer_2"}],
        conversations=[{"id": "c1", "buyer_id": "buyer_1", "seller_id": "seller_2"},
                       {"id": "c2", "buyer_id": "buyer_2", "seller_id": "seller_1"}],
        messages=[{"conversation_id": "c1"}, {"conversation_id": "c2"}],
        whatsapp_clicks=[{"sellerId": "seller_1"}, {"sellerId": "seller_2"}],
    )


def test_erase_buyer():
    db = _db()
    asyncio.run(erase_buyer(db, "buyer_1"))
    assert [u["id"] for u in db.users.docs] == ["buyer_2"]
    assert [i["userId"] for i in db.interactions.docs] == ["buyer_2"]
    assert [c["id"] for c in db.conversations.docs] == ["c2"]
    assert [m["conversation_id"] for m in db.messages.docs] == ["c2"]
    assert [n["recipient_id"] for n in db.notifications.docs] == ["seller_1"]
    # Commande gardée, sans coordonnées
    order = db.orders.docs[0]
    assert order["totalAmount"] == 15000
    assert order["buyerName"] == DELETED_NAME
    assert order["buyerWhatsapp"] is None and order["shippingPhone"] is None
    assert order["shippingAddress"] is None
    assert db.reviews.docs[0]["buyerName"] == DELETED_NAME


def test_erase_seller():
    db = _db()
    asyncio.run(erase_seller(db, "seller_1"))
    assert [s["id"] for s in db.sellers.docs] == ["seller_2"]
    assert [p["id"] for p in db.products.docs] == ["p2"]
    assert [c["sellerId"] for c in db.whatsapp_clicks.docs] == ["seller_2"]
    assert [c["id"] for c in db.conversations.docs] == ["c1"]
    assert [m["conversation_id"] for m in db.messages.docs] == ["c1"]
    assert [n["recipient_id"] for n in db.notifications.docs] == ["buyer_1"]
    assert len(db.orders.docs) == 1  # commandes gardées
