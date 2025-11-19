"""
Debug des produits - version simple
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
        print(f"\n--- Produit: {product.get('name')} ---")

        # Vérifier tous les champs possibles
        seller_id_field = product.get('seller_id')
        sellerId_field = product.get('sellerId')

        print(f"seller_id: {seller_id_field} (type: {type(seller_id_field).__name__ if seller_id_field else 'None'})")
        print(f"sellerId: {sellerId_field} (type: {type(sellerId_field).__name__ if sellerId_field else 'None'})")

        # Le sellerId à utiliser
        seller_id_to_use = sellerId_field or seller_id_field
        print(f"ID a utiliser: {seller_id_to_use}")

        if seller_id_to_use:
            # Essayer de trouver le vendeur
            try:
                if isinstance(seller_id_to_use, str):
                    obj_id = ObjectId(seller_id_to_use)
                    print(f"Conversion en ObjectId reussie: {obj_id}")

                    seller = await db.sellers.find_one({"_id": obj_id})
                    if seller:
                        print(f"SUCCES! Vendeur trouve: {seller.get('businessName', seller.get('name'))}")
                    else:
                        print(f"ERREUR! Aucun vendeur avec cet ObjectId")
                        print("Vendeurs disponibles:")
                        for s in sellers:
                            print(f"  - {str(s['_id'])}: {s.get('businessName', s.get('name'))}")
                elif isinstance(seller_id_to_use, ObjectId):
                    print("Deja un ObjectId")
                    seller = await db.sellers.find_one({"_id": seller_id_to_use})
                    if seller:
                        print(f"SUCCES! Vendeur trouve: {seller.get('businessName', seller.get('name'))}")
                else:
                    print(f"Type inconnu: {type(seller_id_to_use)}")
            except Exception as e:
                print(f"EXCEPTION: {type(e).__name__}: {str(e)}")

    client.close()


if __name__ == "__main__":
    asyncio.run(debug_products())
