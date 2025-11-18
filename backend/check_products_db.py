import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import json

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def check_products():
    print("=== Verification des produits ===\n")

    products = await db.products.find().to_list(10)

    if products:
        print(f"Nombre de produits: {len(products)}\n")
        print("Premier produit:")
        first_product = products[0]

        # Afficher les champs du produit
        for key, value in first_product.items():
            if key != '_id':
                print(f"  {key}: {value}")
            else:
                print(f"  {key}: {str(value)}")

        print("\n=== Verification des vendeurs ===\n")

        # Si le produit a un sellerId, chercher le vendeur
        if 'sellerId' in first_product:
            seller_id = first_product['sellerId']
            print(f"sellerId du produit: {seller_id}\n")

            # Chercher tous les vendeurs
            sellers = await db.sellers.find().to_list(100)
            print(f"Nombre de vendeurs: {len(sellers)}\n")

            if sellers:
                print("Premiers vendeurs:")
                for seller in sellers[:3]:
                    print(f"  - ID: {str(seller['_id'])}")
                    print(f"    Nom: {seller.get('businessName', seller.get('name', 'N/A'))}")
                    print(f"    WhatsApp: {seller.get('whatsapp', 'N/A')}")
                    print()

                # Trouver le vendeur correspondant
                from bson import ObjectId
                try:
                    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
                    if seller:
                        print(f"Vendeur trouve pour le produit:")
                        print(f"  Nom: {seller.get('businessName', seller.get('name', 'N/A'))}")
                    else:
                        print("ATTENTION: Vendeur non trouve pour ce sellerId!")
                except Exception as e:
                    print(f"Erreur lors de la recherche du vendeur: {e}")
    else:
        print("Aucun produit trouve dans la base de donnees")

    client.close()


if __name__ == "__main__":
    asyncio.run(check_products())
