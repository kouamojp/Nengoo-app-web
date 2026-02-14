#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script simple pour tester les métadonnées Open Graph d'un produit
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Fix encoding for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

async def test_product_og(product_identifier=None):
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client.nengoo

    if product_identifier:
        # Test specific product
        product = await db.products.find_one({"id": product_identifier})
        if not product:
            product = await db.products.find_one({"slug": product_identifier})

        if not product:
            print(f"❌ Produit '{product_identifier}' introuvable")
            client.close()
            return

        products = [product]
    else:
        # Test all products
        products_cursor = db.products.find({})
        products = await products_cursor.to_list(None)

    frontend_url = os.getenv("FRONTEND_URL", "https://www.nengoo.com")

    print("=" * 80)
    print("🔍 TEST DES MÉTADONNÉES OPEN GRAPH")
    print("=" * 80)
    print(f"Frontend URL: {frontend_url}\n")

    for product in products:
        product_id = product.get("id", "N/A")
        product_name = product.get("name", "Sans nom")
        if isinstance(product_name, dict):
            product_name = product_name.get('fr', product_name.get('en', 'Sans nom'))

        slug = product.get("slug", product_id)
        images = product.get("images", [])

        print("-" * 80)
        print(f"📦 Produit: {product_name}")
        print(f"   ID: {product_id}")
        print(f"   Slug: {slug}")
        print(f"   URL: {frontend_url}/product/{slug}")
        print(f"   URL OG: {frontend_url}/api/og/product/{slug}")

        # Validate image
        if not images:
            print(f"   ❌ Images: Aucun tableau d'images")
            print(f"   → Utilise le fallback: {frontend_url}/images/logo-nengoo.png")
        elif len(images) == 0:
            print(f"   ❌ Images: Tableau vide")
            print(f"   → Utilise le fallback: {frontend_url}/images/logo-nengoo.png")
        elif not images[0]:
            print(f"   ❌ Images: Première image est None/null")
            print(f"   → Utilise le fallback: {frontend_url}/images/logo-nengoo.png")
        elif not isinstance(images[0], str):
            print(f"   ❌ Images: Type invalide ({type(images[0])})")
            print(f"   → Utilise le fallback: {frontend_url}/images/logo-nengoo.png")
        elif not images[0].strip():
            print(f"   ❌ Images: Chaîne vide ou espaces uniquement")
            print(f"   → Utilise le fallback: {frontend_url}/images/logo-nengoo.png")
        else:
            image_url = images[0].strip()

            # Process image URL
            if not image_url.startswith("http"):
                if image_url.startswith("/"):
                    final_url = f"{frontend_url}{image_url}"
                else:
                    final_url = f"{frontend_url}/{image_url}"
                print(f"   ⚠️  Images: URL relative")
                print(f"      Original: {image_url}")
                print(f"      Convertie: {final_url}")
            elif image_url.startswith("http://"):
                final_url = image_url.replace("http://", "https://", 1)
                print(f"   ⚠️  Images: HTTP converti en HTTPS")
                print(f"      Original: {image_url}")
                print(f"      Convertie: {final_url}")
            else:
                final_url = image_url
                print(f"   ✅ Images: URL valide HTTPS")
                print(f"      URL: {final_url}")

            # Determine image type
            if final_url.lower().endswith('.png'):
                image_type = "image/png"
            elif final_url.lower().endswith('.webp'):
                image_type = "image/webp"
            elif final_url.lower().endswith('.gif'):
                image_type = "image/gif"
            else:
                image_type = "image/jpeg"

            print(f"   📄 Type: {image_type}")

        print()

    print("=" * 80)
    print("💡 ÉTAPES SUIVANTES")
    print("=" * 80)
    print("1. Si vous voyez des ❌, corrigez les URLs d'images dans l'admin")
    print("2. Testez avec l'outil Facebook: https://developers.facebook.com/tools/debug/")
    print("3. Entrez l'URL du produit et cliquez 'Scrape Again'")
    print("4. Attendez 5-10 minutes puis testez sur WhatsApp")

    client.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Test specific product by ID or slug
        asyncio.run(test_product_og(sys.argv[1]))
    else:
        # Test all products
        asyncio.run(test_product_og())
