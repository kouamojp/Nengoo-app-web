#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de diagnostic pour vérifier les URLs d'images des produits
et identifier les problèmes potentiels avec les métadonnées WhatsApp
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

async def check_product_images():
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client.nengoo

    print("🔍 Vérification des images des produits...\n")

    # Get all products
    products_cursor = db.products.find({})
    products = await products_cursor.to_list(None)

    print(f"📦 Total de produits: {len(products)}\n")

    # Statistics
    stats = {
        "total": len(products),
        "no_images": 0,
        "empty_images_array": 0,
        "empty_first_image": 0,
        "valid_images": 0,
        "http_images": 0,
        "relative_images": 0,
        "https_images": 0
    }

    problematic_products = []

    for product in products:
        product_id = product.get("id", "N/A")
        product_name = product.get("name", "Sans nom")
        images = product.get("images", [])

        # Check for various image issues
        if not images:
            stats["no_images"] += 1
            problematic_products.append({
                "id": product_id,
                "name": product_name,
                "issue": "Aucun tableau d'images",
                "images": images
            })
        elif len(images) == 0:
            stats["empty_images_array"] += 1
            problematic_products.append({
                "id": product_id,
                "name": product_name,
                "issue": "Tableau d'images vide",
                "images": images
            })
        elif not images[0] or (isinstance(images[0], str) and images[0].strip() == ""):
            stats["empty_first_image"] += 1
            problematic_products.append({
                "id": product_id,
                "name": product_name,
                "issue": "Première image vide ou chaîne vide",
                "images": images
            })
        else:
            stats["valid_images"] += 1
            image_url = images[0]

            # Check URL type
            if image_url.startswith("https://"):
                stats["https_images"] += 1
            elif image_url.startswith("http://"):
                stats["http_images"] += 1
                problematic_products.append({
                    "id": product_id,
                    "name": product_name,
                    "issue": "Image en HTTP (non sécurisé)",
                    "images": [image_url]
                })
            elif not image_url.startswith("http"):
                stats["relative_images"] += 1
                problematic_products.append({
                    "id": product_id,
                    "name": product_name,
                    "issue": "URL relative (sera convertie en absolue)",
                    "images": [image_url]
                })

    # Print statistics
    print("=" * 60)
    print("📊 STATISTIQUES")
    print("=" * 60)
    print(f"Total de produits: {stats['total']}")
    print(f"✅ Images valides: {stats['valid_images']}")
    print(f"  └─ HTTPS: {stats['https_images']}")
    print(f"  └─ HTTP (converti en HTTPS): {stats['http_images']}")
    print(f"  └─ URLs relatives: {stats['relative_images']}")
    print(f"\n❌ Problèmes:")
    print(f"  └─ Pas de champ 'images': {stats['no_images']}")
    print(f"  └─ Tableau vide: {stats['empty_images_array']}")
    print(f"  └─ Première image vide: {stats['empty_first_image']}")

    # Print problematic products
    if problematic_products:
        print("\n" + "=" * 60)
        print(f"⚠️  PRODUITS PROBLÉMATIQUES ({len(problematic_products)})")
        print("=" * 60)
        for i, prod in enumerate(problematic_products[:20], 1):  # Limit to first 20
            print(f"\n{i}. {prod['name'][:50]}")
            print(f"   ID: {prod['id']}")
            print(f"   Problème: {prod['issue']}")
            print(f"   Images: {prod['images']}")

        if len(problematic_products) > 20:
            print(f"\n... et {len(problematic_products) - 20} autres produits")

    print("\n" + "=" * 60)
    print("💡 RECOMMANDATIONS")
    print("=" * 60)
    print("1. Les produits avec des images vides n'afficheront pas d'aperçu WhatsApp")
    print("2. Les images HTTP seront automatiquement converties en HTTPS")
    print("3. Les URLs relatives seront converties en URLs absolues")
    print("4. WhatsApp met en cache les métadonnées pendant plusieurs jours")
    print("5. Pour forcer WhatsApp à rafraîchir: https://developers.facebook.com/tools/debug/")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_product_images())
