"""Adresses lisibles et pages sans JavaScript (SEO).

- boutique : /seller/<nom-de-la-boutique>, l'ancienne adresse /seller/<id> redirige ;
- produit : slug sans le nom de la boutique, l'ancien slug redirige ;
- catégorie : /catalog/<slug sans accents>, l'ancien nom accentué redirige ;
- sitemap : vraies dates, pas de catégorie ni de boutique vide.

Les scénarios avec base s'exécutent sur une base MongoDB LOCALE jetable
(ignorés sans MongoDB). Lancer depuis backend/ :  python -m pytest tests/test_seo_urls.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402
import seo_pages  # noqa: E402


def test_slugs_have_no_accents_nor_shop_name():
    assert server.generate_slug("Électronique") == "electronique"
    assert server.generate_slug("Produits laitiers et œufs") == "produits-laitiers-et-oeufs"
    assert server.generate_slug("Billets d’avion & voyages") == "billets-d-avion-voyages"
    name = "Pompe à eau moteur – AUTO-BUSINESS 237"
    assert server.product_slug_base(name, "AUTO-BUSINESS 237") == "pompe-a-eau-moteur"
    assert server.product_slug_base("AUTO-BUSINESS 237 - Amortisseur", "AUTO-BUSINESS 237") == "amortisseur"
    # Nom de boutique au milieu du nom : laissé tel quel
    assert server.product_slug_base("Robe Mode chic", "Mode") == "robe-mode-chic"
    # Produit qui ne porte que le nom de la boutique
    assert server.product_slug_base("Kas Parts", "KAS Parts") == "kas-parts"


def test_pages_are_plain_html_with_structured_data():
    product = {"id": "p1", "slug": "robe-wax", "name": "Robe <wax>", "price": 15000, "promoPrice": 12000,
               "stock": 2, "description": "<p>Belle robe</p>", "sellerName": "Atelier", "sellerId": "s1"}
    seller = {"id": "s1", "slug": "atelier", "businessName": "Atelier", "city": "Douala", "status": "approved"}
    page = seo_pages.product_page(product, seller, [("Mode femme", "https://x/catalog/mode-femme")], "https://x")
    assert page["canonical"] == "https://x/product/robe-wax"
    assert "<h1" in page["body"] and "Robe &lt;wax&gt;" in page["body"]
    assert 'href="https://x/seller/atelier"' in page["body"]
    assert page["jsonLd"][0]["offers"]["price"] == 12000
    assert page["jsonLd"][0]["offers"]["availability"].endswith("InStock")
    assert [i["name"] for i in page["jsonLd"][1]["itemListElement"]] == ["Accueil", "Mode femme", "Robe <wax>"]

    parent = {"id": "c1", "name": "Construction et bricolage"}
    child = {"id": "c2", "name": "Outillage et bricolage", "parentId": "c1"}
    sub = seo_pages.category_page(child, parent, [], [], "https://x", server.generate_slug)
    top = seo_pages.category_page(parent, None, [child], [product], "https://x", server.generate_slug)
    # Titres distincts, la sous-catégorie nomme sa catégorie principale
    assert sub["title"] != top["title"] and "Construction et bricolage" in sub["title"]
    assert 'href="https://x/catalog/outillage-et-bricolage"' in top["body"]
    assert sub["robots"] == "noindex,follow" and top["robots"] is None


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")
def test_readable_addresses_and_redirects(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        try:
            base = {"whatsapp": "+237690000000", "name": "V", "email": "v@x.cm", "city": "Douala",
                    "region": "Littoral", "address": "Akwa", "categories": [], "description": ""}
            await db.sellers.insert_many([
                {**base, "id": "seller_d2208233", "businessName": "AUTO-BUSINESS 237", "status": "approved"},
                {**base, "id": "seller_2", "businessName": "Auto Business 237", "status": "approved"},
                {**base, "id": "seller_3", "businessName": "Orders", "status": "approved"},
                {**base, "id": "seller_4", "businessName": "Boutique vide", "status": "approved"},
            ])
            await db.categories.insert_many([
                {"id": "c1", "name": "Automobile et pièces détachées"},
                {"id": "c2", "name": "Pièces auto", "parentId": "c1"},
                {"id": "c3", "name": "Électronique", "formerNames": ["High-tech"]},
            ])
            when = datetime(2026, 3, 14, 9, 0)
            await db.products.insert_many([
                {"id": "p1", "slug": "pompe-a-eau-moteur-auto-business-237", "name": "Pompe à eau moteur – AUTO-BUSINESS 237",
                 "price": 20000, "stock": 3, "status": "approved", "category": "c2", "description": "Pompe", "images": [],
                 "sellerId": "seller_d2208233", "sellerName": "AUTO-BUSINESS 237", "updatedAt": when},
                {"id": "p2", "slug": "amortisseur", "name": "Amortisseur", "price": 5000, "stock": 1, "description": "", "images": [],
                 "status": "approved", "category": "c2", "sellerId": "seller_2", "sellerName": "Auto Business 237",
                 "updatedAt": when},
            ])

            assert await server.ensure_seo_slugs() == {"sellers": 4, "products": 1}
            # Une seconde fois : rien à refaire
            assert await server.ensure_seo_slugs() == {"sellers": 0, "products": 0}

            slugs = {s["id"]: s["slug"] async for s in db.sellers.find()}
            assert slugs == {"seller_d2208233": "auto-business-237", "seller_2": "auto-business-237-2",
                             "seller_3": "boutique-orders", "seller_4": "boutique-vide"}
            p1 = await db.products.find_one({"id": "p1"})
            assert p1["slug"] == "pompe-a-eau-moteur"
            assert p1["previousSlugs"] == ["pompe-a-eau-moteur-auto-business-237"]

            # L'API trouve la boutique et le produit par l'ancienne et la nouvelle adresse
            req = seo_request()
            assert (await server.get_seller("auto-business-237", req))["id"] == "seller_d2208233"
            assert (await server.get_seller("seller_d2208233", req))["slug"] == "auto-business-237"
            assert (await server.get_product("pompe-a-eau-moteur-auto-business-237")).id == "p1"
            assert (await server.get_product("amortisseur")).sellerSlug == "auto-business-237-2"

            # Pages : anciennes adresses redirigées vers l'adresse actuelle
            page = server.seo_page
            assert await page("/seller/seller_d2208233") == {"status": 301, "location": "/seller/auto-business-237"}
            assert await page("/product/pompe-a-eau-moteur-auto-business-237") == {
                "status": 301, "location": "/product/pompe-a-eau-moteur"}
            assert await page("/product/p1") == {"status": 301, "location": "/product/pompe-a-eau-moteur"}
            assert await page("/catalog/Électronique") == {"status": 301, "location": "/catalog/electronique"}
            assert await page("/catalog/High-tech") == {"status": 301, "location": "/catalog/electronique"}
            assert (await page("/catalog/nimporte-quoi"))["status"] == 404

            product = await page("/product/pompe-a-eau-moteur")
            assert product["status"] == 200 and product["title"].startswith("Pompe à eau moteur – AUTO-BUSINESS 237")
            assert "/catalog/automobile-et-pieces-detachees" in product["body"]
            assert "/seller/auto-business-237" in product["body"]

            shop = await page("/seller/auto-business-237")
            assert "/product/pompe-a-eau-moteur" in shop["body"] and shop["robots"] is None
            assert (await page("/seller/boutique-vide"))["robots"] == "noindex,follow"

            parent = await page("/catalog/automobile-et-pieces-detachees")
            assert "/product/amortisseur" in parent["body"] and "/catalog/pieces-auto" in parent["body"]

            # Renommer une boutique : nouvelle adresse, l'ancienne redirige
            await server.update_seller("seller_4", server.SellerUpdate(businessName="Chez Awa"), seo_request(admin=True),
                                       server.BackgroundTasks(), role="admin")
            assert (await db.sellers.find_one({"id": "seller_4"}))["slug"] == "chez-awa"
            assert await page("/seller/boutique-vide") == {"status": 301, "location": "/seller/chez-awa"}

            sitemap = (await server.generate_sitemap()).body.decode()
            assert "/seller/auto-business-237</loc>" in sitemap and "seller_d2208233" not in sitemap
            assert "/catalog/pieces-auto</loc>" in sitemap
            assert "/catalog/automobile-et-pieces-detachees</loc>" in sitemap
            # Catégorie et boutique sans produit : absentes
            assert "/catalog/electronique" not in sitemap and "chez-awa" not in sitemap
            assert "%C3" not in sitemap
            assert "<lastmod>2026-03-14</lastmod>" in sitemap
            assert sitemap.count("<lastmod>") == sitemap.count("<url>") - 3  # pages fixes sans date
        finally:
            await client.drop_database(name)
            client.close()

    asyncio.run(scenario())


def seo_request(admin=False):
    from session_helpers import fake_request
    return fake_request({"sub": "a1", "typ": "admin", "role": "admin"} if admin else None)
