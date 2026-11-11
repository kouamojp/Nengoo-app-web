"""
Outils de l'assistant : sa seule voie d'accès aux données de Nengoo.

Tous sont en lecture seule et ne touchent que des données publiques : le
catalogue en vente et les tarifs de livraison. Aucun ne lit de commande ni de
compte client. Une instance de Catalog vit le temps d'un message et retient
tout ce qu'elle a renvoyé au modèle : les fiches affichées au client et les
montants autorisés dans sa réponse en sont tirés (voir assistant.py).
"""
import json
from typing import Awaitable, Callable, Dict, List, Optional, Set

from catalog_rules import normalize_city
from category_tree import normalize_name
from delivery import load_settings, zone_fee
from product_search import search_products_detailed

MAX_RESULTS = 6
MAX_DETAILS = 4
DESCRIPTION_LENGTH = 220
MAX_SPECS = 12

# Un produit visible par les clients : en stock, ou service (sans stock)
FOR_SALE = {
    "status": "approved",
    "price": {"$gt": 0},
    "$or": [{"stock": {"$gt": 0}}, {"kind": "service"}],
}

TOOLS = [
    {"type": "function", "function": {
        "name": "search_products",
        "description": "Cherche dans le catalogue les produits en vente et en stock. Tolère fautes, "
                       "accents et synonymes. `exactMatch: false` veut dire que les résultats ne "
                       "contiennent pas tous les mots demandés.",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "Mots-clés du produit (type, marque, caractéristiques), "
                                                       "sans phrase ni ville ni budget. Ex. : téléphone android"},
            "min_price": {"type": "number", "description": "Prix minimum en FCFA"},
            "max_price": {"type": "number", "description": "Budget maximum en FCFA"},
            "city": {"type": "string", "description": "Ville du vendeur, si le client en cite une"},
            "sort": {"type": "string", "enum": ["relevance", "price_asc", "price_desc", "rating"]},
        }},
    }},
    {"type": "function", "function": {
        "name": "get_product_details",
        "description": "Fiches complètes de 1 à 4 produits : caractéristiques, description, vendeur, "
                       "prix, disponibilité. À appeler avant de comparer ou de citer une caractéristique.",
        "parameters": {"type": "object", "properties": {
            "product_ids": {"type": "array", "items": {"type": "string"}},
        }, "required": ["product_ids"]},
    }},
    {"type": "function", "function": {
        "name": "find_similar_products",
        "description": "Produits en stock de la même catégorie, du prix le plus proche au plus éloigné.",
        "parameters": {"type": "object", "properties": {
            "product_id": {"type": "string"},
            "max_price": {"type": "number", "description": "Budget maximum en FCFA"},
        }, "required": ["product_id"]},
    }},
    {"type": "function", "function": {
        "name": "get_delivery_info",
        "description": "Tarif de livraison réglé pour une ville ou un quartier, seuil de livraison offerte.",
        "parameters": {"type": "object", "properties": {
            "city": {"type": "string"},
            "neighborhood": {"type": "string"},
        }},
    }},
]


def paid_price(product: dict) -> float:
    """Prix réellement payé : la promotion si elle est valable."""
    price = product.get("price") or 0
    promo = product.get("promoPrice") or 0
    return promo if 0 < promo < price else price


def _first_image(product: dict) -> Optional[str]:
    for field in ("thumbnails", "images"):
        for image in product.get(field) or []:
            if image:
                return image
    return None


def _whole(value: float) -> int:
    return int(round(value or 0))


class Catalog:
    def __init__(self, db, category_names: Callable[[], Awaitable[Dict[str, str]]],
                 log_miss: Optional[Callable[[str], Awaitable[None]]] = None):
        self._db = db
        self._category_names = category_names
        self._log_miss = log_miss
        self._sellers: Optional[Dict[str, dict]] = None
        self._products: Optional[List[dict]] = None
        # Ce que le modèle a vu pendant ce message
        self.seen: Dict[str, dict] = {}
        self.last_results: List[str] = []
        self.amounts: Set[int] = set()
        self.searched_without_result = False

    async def _seller_map(self) -> Dict[str, dict]:
        if self._sellers is None:
            sellers = await self._db.sellers.find({}, {"_id": 0, "id": 1, "city": 1, "logoUrl": 1}).to_list(None)
            self._sellers = {s.get("id"): s for s in sellers}
        return self._sellers

    async def _for_sale(self) -> List[dict]:
        if self._products is None:
            self._products = await self._db.products.find(FOR_SALE, {"_id": 0}).to_list(None)
        return self._products

    async def _seller_city(self, product: dict) -> Optional[str]:
        return ((await self._seller_map()).get(product.get("sellerId")) or {}).get("city")

    async def _remember(self, product: dict) -> dict:
        """Fiche affichable (le contrat partagé par le site et l'app)."""
        card = {
            "id": product["id"],
            "slug": product.get("slug"),
            "name": product.get("name"),
            "price": _whole(product.get("price")),
            "paidPrice": _whole(paid_price(product)),
            # Sans photo : logo de la boutique
            "image": _first_image(product)
            or ((await self._seller_map()).get(product.get("sellerId")) or {}).get("logoUrl"),
            "sellerName": product.get("sellerName"),
            "sellerCity": await self._seller_city(product),
            "rating": product.get("rating") or 0,
        }
        self.seen[product["id"]] = card
        self.amounts.update({_whole(product.get(f)) for f in ("price", "promoPrice", "oldPrice") if product.get(f)})
        return card

    async def _brief(self, product: dict) -> dict:
        """Ce que voit le modèle d'un résultat de recherche : peu de texte, peu de jetons."""
        card = await self._remember(product)
        return {
            "id": card["id"],
            "name": card["name"],
            "brand": product.get("brand"),
            "condition": product.get("condition"),
            "paidPrice": card["paidPrice"],
            "seller": card["sellerName"],
            "sellerCity": card["sellerCity"],
            "rating": card["rating"],
            "description": (product.get("description") or "")[:DESCRIPTION_LENGTH],
        }

    async def search_products(self, query: Optional[str] = None, min_price: Optional[float] = None,
                              max_price: Optional[float] = None, city: Optional[str] = None,
                              sort: Optional[str] = None) -> dict:
        query = (query or "").strip()[:120]
        products = await self._for_sale()
        if min_price is not None:
            products = [p for p in products if paid_price(p) >= min_price]
        if max_price is not None:
            products = [p for p in products if paid_price(p) <= max_price]

        names = await self._category_names()
        exact = True
        if query:
            products, exact = search_products_detailed(products, query, names)
            if not exact and self._log_miss and min_price is None and max_price is None and not city:
                await self._log_miss(query)

        elsewhere = 0
        if city:
            wanted = normalize_name(normalize_city(city) or "")
            sellers = await self._seller_map()
            local = [p for p in products
                     if normalize_name(normalize_city((sellers.get(p.get("sellerId")) or {}).get("city")) or "") == wanted]
            elsewhere = len(products) - len(local)
            products = local

        if sort == "price_asc":
            products = sorted(products, key=paid_price)
        elif sort == "price_desc":
            products = sorted(products, key=paid_price, reverse=True)
        elif sort == "rating":
            products = sorted(products, key=lambda p: p.get("rating") or 0, reverse=True)
        elif not query:
            products = sorted(products, key=lambda p: p.get("sold") or 0, reverse=True)

        found = products[:MAX_RESULTS]
        self.last_results = [p["id"] for p in found]
        if not found:
            self.searched_without_result = True
        result = {"count": len(products), "exactMatch": exact, "products": [await self._brief(p) for p in found]}
        if city:
            # Permet de dire « rien à Douala, mais N offres dans d'autres villes »
            result["matchesInOtherCities"] = elsewhere
        return result

    async def _find_one(self, identifier: str) -> Optional[dict]:
        return await self._db.products.find_one(
            {"status": "approved", "$or": [{"id": identifier}, {"slug": identifier}]}, {"_id": 0})

    async def get_product_details(self, product_ids: List[str]) -> dict:
        details = []
        for identifier in list(dict.fromkeys(product_ids or []))[:MAX_DETAILS]:
            product = await self._find_one(str(identifier))
            if not product:
                details.append({"id": identifier, "found": False})
                continue
            available = (product.get("stock") or 0) > 0
            if available:
                brief = await self._brief(product)
            else:
                # Montrée au modèle pour qu'il le dise, jamais proposée en fiche
                brief = {"id": product["id"], "name": product.get("name"), "paidPrice": _whole(paid_price(product))}
                self.amounts.add(_whole(paid_price(product)))
            specs = dict(list((product.get("specs") or {}).items())[:MAX_SPECS])
            details.append({**brief, "found": True, "available": available, "specs": specs,
                            "description": (product.get("description") or "")[:DESCRIPTION_LENGTH * 3]})
        return {"products": details}

    async def find_similar_products(self, product_id: str, max_price: Optional[float] = None) -> dict:
        reference = await self._find_one(str(product_id))
        if not reference:
            return {"found": False, "products": []}
        target = paid_price(reference)
        similar = [p for p in await self._for_sale()
                   if p.get("category") == reference.get("category") and p["id"] != reference["id"]
                   and (max_price is None or paid_price(p) <= max_price)]
        similar.sort(key=lambda p: abs(paid_price(p) - target))
        found = similar[:MAX_RESULTS]
        self.last_results = [p["id"] for p in found]
        return {"found": True, "products": [await self._brief(p) for p in found]}

    async def get_delivery_info(self, city: Optional[str] = None, neighborhood: Optional[str] = None) -> dict:
        settings = await load_settings(self._db)
        fee = zone_fee(settings["zones"], city, neighborhood)
        fee = settings["standardFee"] if fee is None else fee
        free_above = settings.get("freeAbove")
        self.amounts.update({_whole(fee), _whole(settings["standardFee"])})
        if free_above:
            self.amounts.add(_whole(free_above))
        return {
            "city": normalize_city(city),
            "fee": _whole(fee),
            "freeAboveSubtotal": _whole(free_above) if free_above else None,
            "pickupPointFee": 0,
            "note": "Un vendeur peut appliquer son propre tarif : le montant exact est affiché "
                    "avant de confirmer la commande. Aucun délai de livraison n'est connu.",
        }

    async def run(self, name: str, arguments: str) -> str:
        """Exécute un appel d'outil du modèle ; une erreur lui revient en clair."""
        tools = {
            "search_products": self.search_products,
            "get_product_details": self.get_product_details,
            "find_similar_products": self.find_similar_products,
            "get_delivery_info": self.get_delivery_info,
        }
        tool = tools.get(name)
        if tool is None:
            return json.dumps({"error": "outil inconnu"})
        try:
            parsed = json.loads(arguments or "{}")
            if not isinstance(parsed, dict):
                raise ValueError
            result = await tool(**parsed)
        except (ValueError, TypeError):
            return json.dumps({"error": "paramètres invalides"})
        return json.dumps(result, ensure_ascii=False, default=str)
