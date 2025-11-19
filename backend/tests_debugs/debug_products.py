"""
Debug des produits pour voir exactement ce qu'il y a dans la DB
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import json
from bson import ObjectId

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def debug_products():
    print("=== DEBUG PRODUITS ===\n")

    products = await db.products.find().to_list(100)
    sellers = await db.sellers.find().to_list(100)

    print(f"Nombre de produits: {len(products)}")
    print(f"Nombre de vendeurs: {len(sellers)}\n")

    for product in products:
        print(f"\nProduit: {product.get('name')}")
        print(f"  _id: {product.get('_id')}")

        # Vérifier tous les champs possibles pour seller
        print("  Champs seller:")
        if 'seller_id' in product:
            print(f"    seller_id: {product['seller_id']} (type: {type(product['seller_id']).__name__})")
        if 'sellerId' in product:
            print(f"    sellerId: {product['sellerId']} (type: {type(product['sellerId']).__name__})")

        # Essayer de trouver le vendeur
        seller_id = product.get('sellerId') or product.get('seller_id')
        print(f"  seller_id extrait: {seller_id} (type: {type(seller_id).__name__ if seller_id else 'None'})")

        if seller_id:
            # Essayer différentes méthodes
            seller_found = None

            # Méthode 1: Conversion en ObjectId
            try:
                if isinstance(seller_id, str):
                    seller_found = await db.sellers.find_one({"_id": ObjectId(seller_id)})
                    if seller_found:
                        print(f"  ✓ Vendeur trouvé via ObjectId(str): {seller_found.get('businessName', seller_found.get('name'))}")
                else:
                    print(f"  ✗ seller_id n'est pas une string, c'est: {type(seller_id)}")
            except Exception as e:
                print(f"  ✗ Erreur ObjectId(str): {str(e)}")

            # Méthode 2: Si c'est déjà un ObjectId
            if not seller_found and isinstance(seller_id, ObjectId):
                try:
                    seller_found = await db.sellers.find_one({"_id": seller_id})
                    if seller_found:
                        print(f"  ✓ Vendeur trouvé via ObjectId direct: {seller_found.get('businessName', seller_found.get('name'))}")
                except Exception as e:
                    print(f"  ✗ Erreur ObjectId direct: {str(e)}")

            # Si toujours pas trouvé, lister les vendeurs disponibles
            if not seller_found:
                print(f"  ⚠ Vendeur non trouvé!")
                print(f"  Vendeurs disponibles:")
                for seller in sellers[:3]:
                    print(f"    - {str(seller['_id'])}: {seller.get('businessName', seller.get('name'))}")

    client.close()


if __name__ == "__main__":
    asyncio.run(debug_products())
