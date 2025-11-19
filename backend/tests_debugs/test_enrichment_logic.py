"""
Test de la logique d'enrichissement directement avec MongoDB
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


def convert_objectid_to_str(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def test_enrichment():
    print("=== TEST DE LA LOGIQUE D'ENRICHISSEMENT ===\n")

    products = await db.products.find().to_list(1000)

    enriched_products = []
    for product in products:
        product_dict = convert_objectid_to_str(product.copy())

        print(f"\n--- Produit: {product.get('name')} ---")

        # Get seller_id: prioritize 'sellerId' from MongoDB, fallback to 'seller_id'
        seller_id = product.get('sellerId') or product.get('seller_id')
        print(f"seller_id extrait: {seller_id} (type: {type(seller_id).__name__})")

        if seller_id:
            # Normalize to string
            seller_id_str = str(seller_id) if not isinstance(seller_id, str) else seller_id
            product_dict['sellerId'] = seller_id_str
            print(f"seller_id normalisé: {seller_id_str}")

            try:
                # Fetch seller
                seller = await db.sellers.find_one({"_id": ObjectId(seller_id_str)})

                if seller:
                    seller_name = seller.get("businessName") or seller.get("name") or "N/A"
                    product_dict["sellerName"] = seller_name
                    product_dict["sellerWhatsapp"] = seller.get("whatsapp")
                    print(f"✓ Vendeur trouvé: {seller_name}")
                else:
                    product_dict["sellerName"] = "Vendeur introuvable"
                    print(f"✗ Vendeur non trouvé")
            except Exception as e:
                product_dict["sellerName"] = f"Erreur: {str(e)}"
                print(f"✗ Erreur: {type(e).__name__}: {str(e)}")
        else:
            product_dict["sellerName"] = "Aucun vendeur"
            product_dict["sellerId"] = None
            print(f"✗ Pas de sellerId")

        enriched_products.append(product_dict)

    print("\n\n=== RÉSUMÉ ===")
    for p in enriched_products:
        print(f"{p.get('name')}: sellerId={p.get('sellerId')}, sellerName={p.get('sellerName')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(test_enrichment())
