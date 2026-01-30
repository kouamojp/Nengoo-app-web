#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de test pour vérifier les métadonnées des images de produits
"""
import os
import sys
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

async def test_product_metadata():
    """Teste la génération des métadonnées pour tous les produits"""

    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_uri)
    db = client.nengoo_marketplace

    print("=" * 80)
    print("TEST DES MÉTADONNÉES DES IMAGES DE PRODUITS")
    print("=" * 80)

    # Récupérer tous les produits
    products = await db.products.find({}).to_list(1000)

    if not products:
        print("\n❌ Aucun produit trouvé dans la base de données")
        return

    print(f"\n✓ Total de produits: {len(products)}")
    print("\n" + "-" * 80)

    # Analyser chaque produit
    issues = []
    valid_count = 0

    frontend_url = os.getenv("FRONTEND_URL", "https://www.nengoo.com")

    for product in products:
        product_id = product.get('id', 'UNKNOWN')
        product_name = product.get('name', 'UNKNOWN')
        if isinstance(product_name, dict):
            product_name = product_name.get('fr', product_name.get('en', 'UNKNOWN'))

        images = product.get('images', [])

        # Test 1: Liste d'images existe et n'est pas vide
        if not images:
            issues.append({
                'id': product_id,
                'name': product_name,
                'issue': 'Aucune image',
                'images': images
            })
            continue

        # Test 2: La liste contient au moins un élément
        if len(images) == 0:
            issues.append({
                'id': product_id,
                'name': product_name,
                'issue': 'Liste d\'images vide',
                'images': images
            })
            continue

        # Test 3: Le premier élément n'est pas None ou vide
        first_image = images[0]
        if not first_image:
            issues.append({
                'id': product_id,
                'name': product_name,
                'issue': 'Première image est None ou vide',
                'images': images
            })
            continue

        # Test 4: L'URL est valide (commence par http ou /)
        if not (first_image.startswith('http') or first_image.startswith('/')):
            issues.append({
                'id': product_id,
                'name': product_name,
                'issue': f'URL invalide: {first_image[:50]}...',
                'images': images
            })
            continue

        # Construire l'URL finale comme dans le code
        if first_image.startswith("http"):
            final_url = first_image
        elif first_image.startswith("/"):
            final_url = f"{frontend_url}{first_image}"
        else:
            final_url = f"{frontend_url}/{first_image}"

        valid_count += 1
        print(f"✓ {product_id}: {product_name[:40]}")
        print(f"  Image: {final_url}")

    # Afficher les résultats
    print("\n" + "=" * 80)
    print("RÉSULTATS")
    print("=" * 80)
    print(f"✓ Produits avec images valides: {valid_count}/{len(products)}")
    print(f"❌ Produits avec problèmes: {len(issues)}/{len(products)}")

    if issues:
        print("\n" + "-" * 80)
        print("DÉTAILS DES PROBLÈMES")
        print("-" * 80)
        for issue in issues[:20]:  # Afficher les 20 premiers
            print(f"\n❌ Produit: {issue['name'][:40]} (ID: {issue['id']})")
            print(f"   Problème: {issue['issue']}")
            print(f"   Images: {issue['images']}")

    print("\n" + "=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(test_product_metadata())
