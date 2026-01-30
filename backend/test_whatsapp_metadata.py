#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script pour tester les métadonnées WhatsApp des produits
Usage: python test_whatsapp_metadata.py [product_id ou slug]
"""
import sys
import os
import asyncio
import requests
from motor.motor_asyncio import AsyncIOMotorClient

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def test_image_accessibility(image_url):
    """Teste si l'image est accessible publiquement"""
    try:
        response = requests.head(image_url, timeout=5, allow_redirects=True)
        return {
            'accessible': response.status_code == 200,
            'status_code': response.status_code,
            'content_type': response.headers.get('content-type', 'unknown'),
            'content_length': response.headers.get('content-length', 'unknown'),
            'is_https': image_url.startswith('https://')
        }
    except Exception as e:
        return {
            'accessible': False,
            'error': str(e),
            'is_https': image_url.startswith('https://')
        }

def check_image_size(content_length):
    """Vérifie si la taille de l'image est acceptable pour WhatsApp"""
    if content_length == 'unknown':
        return 'unknown', None

    try:
        size_bytes = int(content_length)
        size_mb = size_bytes / (1024 * 1024)

        if size_mb > 5:
            return 'too_large', size_mb
        elif size_mb > 1:
            return 'large', size_mb
        else:
            return 'good', size_mb
    except:
        return 'unknown', None

async def test_product_metadata(product_identifier=None):
    """Teste les métadonnées d'un produit spécifique ou de tous les produits"""

    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    api_base_url = os.getenv('API_BASE_URL', 'http://localhost:8001/api')
    frontend_url = os.getenv('FRONTEND_URL', 'https://www.nengoo.com')

    client = AsyncIOMotorClient(mongo_uri)
    db = client.nengoo_marketplace

    print("=" * 80)
    print("TEST DES MÉTADONNÉES WHATSAPP")
    print("=" * 80)
    print(f"API Base URL: {api_base_url}")
    print(f"Frontend URL: {frontend_url}")
    print("=" * 80)

    # Récupérer le(s) produit(s)
    if product_identifier:
        # Chercher par ID ou slug
        product = await db.products.find_one({"id": product_identifier})
        if not product:
            product = await db.products.find_one({"slug": product_identifier})

        if not product:
            print(f"\n❌ Produit '{product_identifier}' non trouvé")
            client.close()
            return

        products = [product]
        print(f"\n✓ Test du produit: {product_identifier}")
    else:
        # Tester tous les produits
        products = await db.products.find({}).limit(10).to_list(10)
        if not products:
            print("\n❌ Aucun produit trouvé dans la base de données")
            client.close()
            return
        print(f"\n✓ Test de {len(products)} produits")

    print("\n" + "=" * 80)

    # Tester chaque produit
    for i, product in enumerate(products, 1):
        product_id = product.get('id', 'UNKNOWN')
        product_name = product.get('name', 'UNKNOWN')
        if isinstance(product_name, dict):
            product_name = product_name.get('fr', product_name.get('en', 'UNKNOWN'))

        print(f"\n[{i}/{len(products)}] Produit: {product_name[:50]}")
        print(f"ID: {product_id}")
        print(f"Slug: {product.get('slug', 'N/A')}")
        print("-" * 80)

        # Vérifier les images dans la DB
        images = product.get('images', [])
        print(f"\n📸 Images dans la DB:")
        if not images or len(images) == 0:
            print("  ❌ Aucune image")
            continue

        first_image = images[0]
        if not first_image:
            print("  ❌ Première image est None ou vide")
            continue

        print(f"  ✓ Première image: {first_image[:80]}")

        # Construire l'URL finale comme le fait le backend
        if first_image.startswith("http://"):
            final_url = first_image.replace("http://", "https://", 1)
            print(f"  ⚠️  URL convertie HTTP -> HTTPS")
        elif first_image.startswith("https://"):
            final_url = first_image
        elif first_image.startswith("/"):
            final_url = f"{frontend_url}{first_image}"
        else:
            final_url = f"{frontend_url}/{first_image}"

        print(f"  ✓ URL finale: {final_url}")

        # Tester l'accessibilité de l'image
        print(f"\n🔍 Test d'accessibilité:")
        accessibility = test_image_accessibility(final_url)

        if accessibility['accessible']:
            print(f"  ✓ Image accessible (HTTP {accessibility['status_code']})")
            print(f"  ✓ Type: {accessibility['content_type']}")

            # Vérifier la taille
            size_status, size_mb = check_image_size(accessibility['content_length'])
            if size_status == 'good':
                print(f"  ✓ Taille: {size_mb:.2f} MB (optimale)")
            elif size_status == 'large':
                print(f"  ⚠️  Taille: {size_mb:.2f} MB (considérer optimisation)")
            elif size_status == 'too_large':
                print(f"  ❌ Taille: {size_mb:.2f} MB (> 5 MB, WhatsApp peut bloquer)")
            else:
                print(f"  ? Taille: {accessibility['content_length']} bytes")
        else:
            print(f"  ❌ Image non accessible")
            if 'error' in accessibility:
                print(f"     Erreur: {accessibility['error']}")
            else:
                print(f"     HTTP {accessibility['status_code']}")

        # HTTPS check
        if accessibility['is_https']:
            print(f"  ✓ Utilise HTTPS (requis par WhatsApp)")
        else:
            print(f"  ❌ N'utilise pas HTTPS (WhatsApp peut bloquer)")

        # Tester l'endpoint OG
        og_url = f"{api_base_url}/og/product/{product_id}"
        print(f"\n🌐 URL de partage WhatsApp:")
        print(f"  {og_url}")

        # Générer le lien de debug Facebook
        debug_url = f"https://developers.facebook.com/tools/debug/?q={og_url}"
        print(f"\n🔧 Tester dans Facebook Debug Tool:")
        print(f"  {debug_url}")

        # Test de l'endpoint debug
        debug_endpoint = f"{api_base_url}/og/debug/{product_id}"
        print(f"\n🐛 Debug endpoint:")
        print(f"  {debug_endpoint}")

        print("\n" + "=" * 80)

    # Résumé final
    print("\n" + "=" * 80)
    print("PROCHAINES ÉTAPES")
    print("=" * 80)
    print("\n1. Pour chaque produit, tester dans le Facebook Debug Tool")
    print("2. Si l'image n'apparaît pas, cliquer 'Scrape Again'")
    print("3. Partager le lien dans WhatsApp pour vérifier")
    print("4. Si le cache persiste, ajouter ?v=2 à l'URL")
    print("\n" + "=" * 80)

    client.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        product_id = sys.argv[1]
        print(f"\nTest du produit: {product_id}\n")
        asyncio.run(test_product_metadata(product_id))
    else:
        print("\nTest de tous les produits (max 10)\n")
        asyncio.run(test_product_metadata())
