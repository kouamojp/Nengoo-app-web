#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour vérifier l'accessibilité des images de produits
et leur compatibilité avec WhatsApp
"""

import asyncio
import os
import sys
import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Fix encoding for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

async def check_image_url(session, url, product_name, product_id):
    """Vérifie si une image est accessible et compatible WhatsApp"""
    result = {
        "product_id": product_id,
        "product_name": product_name,
        "url": url,
        "status": "unknown",
        "status_code": None,
        "content_type": None,
        "content_length": None,
        "issue": None
    }

    try:
        async with session.head(url, timeout=aiohttp.ClientTimeout(total=10), allow_redirects=True) as response:
            result["status_code"] = response.status
            result["content_type"] = response.headers.get("Content-Type", "unknown")
            result["content_length"] = response.headers.get("Content-Length", "unknown")

            if response.status == 200:
                # Check content type
                content_type = result["content_type"].lower()
                if not any(img_type in content_type for img_type in ["image/", "jpeg", "jpg", "png", "webp", "gif"]):
                    result["status"] = "error"
                    result["issue"] = f"Type de contenu invalide: {content_type}"
                # Check file size (WhatsApp limite à 8MB)
                elif result["content_length"] != "unknown":
                    size_mb = int(result["content_length"]) / (1024 * 1024)
                    if size_mb > 8:
                        result["status"] = "warning"
                        result["issue"] = f"Image trop lourde: {size_mb:.2f}MB (max 8MB pour WhatsApp)"
                    else:
                        result["status"] = "ok"
                else:
                    result["status"] = "ok"
            elif response.status == 403:
                result["status"] = "error"
                result["issue"] = "Accès refusé (403 Forbidden)"
            elif response.status == 404:
                result["status"] = "error"
                result["issue"] = "Image introuvable (404 Not Found)"
            else:
                result["status"] = "error"
                result["issue"] = f"Erreur HTTP {response.status}"

    except asyncio.TimeoutError:
        result["status"] = "error"
        result["issue"] = "Timeout - Image trop lente à charger"
    except aiohttp.ClientConnectorError:
        result["status"] = "error"
        result["issue"] = "Impossible de se connecter au serveur"
    except Exception as e:
        result["status"] = "error"
        result["issue"] = f"Erreur: {str(e)}"

    return result

async def main():
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client.nengoo

    print("🔍 Vérification de l'accessibilité des images...\n")

    # Get all products
    products_cursor = db.products.find({})
    products = await products_cursor.to_list(None)

    print(f"📦 Total de produits: {len(products)}\n")

    # Check image accessibility
    results = []
    async with aiohttp.ClientSession() as session:
        tasks = []
        for product in products:
            images = product.get("images", [])
            if images and images[0] and images[0].strip():
                task = check_image_url(
                    session,
                    images[0],
                    product.get("name", "Sans nom"),
                    product.get("id", "N/A")
                )
                tasks.append(task)

        results = await asyncio.gather(*tasks)

    # Analyze results
    stats = {
        "ok": 0,
        "warning": 0,
        "error": 0
    }

    problematic = []

    for result in results:
        stats[result["status"]] += 1
        if result["status"] in ["error", "warning"]:
            problematic.append(result)

    # Print statistics
    print("=" * 80)
    print("📊 RÉSULTATS")
    print("=" * 80)
    print(f"✅ Images accessibles: {stats['ok']}")
    print(f"⚠️  Images avec avertissement: {stats['warning']}")
    print(f"❌ Images inaccessibles: {stats['error']}")

    # Print problematic images
    if problematic:
        print("\n" + "=" * 80)
        print(f"⚠️  IMAGES PROBLÉMATIQUES ({len(problematic)})")
        print("=" * 80)
        for i, result in enumerate(problematic, 1):
            print(f"\n{i}. {result['product_name'][:60]}")
            print(f"   ID: {result['product_id']}")
            print(f"   URL: {result['url'][:70]}...")
            print(f"   Statut HTTP: {result['status_code']}")
            print(f"   Type: {result['content_type']}")
            if result['content_length'] != 'unknown':
                size_mb = int(result['content_length']) / (1024 * 1024)
                print(f"   Taille: {size_mb:.2f}MB")
            print(f"   ⚠️  Problème: {result['issue']}")

    print("\n" + "=" * 80)
    print("💡 SOLUTIONS")
    print("=" * 80)
    print("1. Pour les images 403/404: Vérifier que l'URL est correcte et publique")
    print("2. Pour les images trop lourdes: Compresser ou redimensionner")
    print("3. Pour forcer WhatsApp à rafraîchir le cache:")
    print("   - https://developers.facebook.com/tools/debug/")
    print("   - Entrer l'URL de la page produit")
    print("   - Cliquer sur 'Scrape Again'")
    print("4. Vérifier que les images sont en HTTPS (WhatsApp bloque HTTP)")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
