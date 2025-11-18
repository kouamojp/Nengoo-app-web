"""
Script pour corriger les seller_id dans les produits
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
from bson import ObjectId

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def fix_seller_ids():
    print("=" * 60)
    print("CORRECTION DES SELLER_ID DANS LES PRODUITS")
    print("=" * 60)
    print()

    # Lister tous les vendeurs
    sellers = await db.sellers.find().to_list(100)
    print(f"Nombre de vendeurs dans la base: {len(sellers)}\n")

    if not sellers:
        print("ERREUR: Aucun vendeur dans la base de donnees!")
        return

    print("Vendeurs disponibles:")
    for seller in sellers:
        print(f"  - ID: {str(seller['_id'])}")
        print(f"    Nom: {seller.get('businessName', seller.get('name', 'N/A'))}")
        print(f"    WhatsApp: {seller.get('whatsapp', 'N/A')}")
        print(f"    Statut: {seller.get('status', 'N/A')}")
        print()

    # Trouver le vendeur système ou le premier vendeur approuvé
    system_seller = None
    for seller in sellers:
        if seller.get('whatsapp') == 'SYSTEM_NENGOO':
            system_seller = seller
            break

    if not system_seller:
        # Prendre le premier vendeur approuvé
        for seller in sellers:
            if seller.get('status') == 'approved':
                system_seller = seller
                break

    if not system_seller and sellers:
        # Prendre le premier vendeur quelle que soit son statut
        system_seller = sellers[0]

    if not system_seller:
        print("ERREUR: Impossible de trouver un vendeur par defaut!")
        return

    default_seller_id = str(system_seller['_id'])
    print(f"Vendeur par defaut selectionne: {system_seller.get('businessName', system_seller.get('name', 'N/A'))}")
    print(f"ID: {default_seller_id}\n")

    # Lister tous les produits
    products = await db.products.find().to_list(1000)
    print(f"Nombre de produits dans la base: {len(products)}\n")

    if not products:
        print("Aucun produit a corriger")
        return

    # Corriger les produits
    updated_count = 0
    for product in products:
        seller_id = product.get('seller_id') or product.get('sellerId')

        # Si seller_id n'existe pas ou est invalide, utiliser le vendeur par defaut
        needs_update = False
        if not seller_id:
            needs_update = True
            print(f"Produit '{product.get('name')}': Pas de seller_id")
        elif isinstance(seller_id, int):
            needs_update = True
            print(f"Produit '{product.get('name')}': seller_id est un entier ({seller_id})")
        elif isinstance(seller_id, str):
            # Vérifier si c'est un ObjectId valide
            try:
                obj_id = ObjectId(seller_id)
                # Vérifier si le vendeur existe
                seller_exists = await db.sellers.find_one({"_id": obj_id})
                if not seller_exists:
                    needs_update = True
                    print(f"Produit '{product.get('name')}': Vendeur inexistant ({seller_id})")
            except:
                needs_update = True
                print(f"Produit '{product.get('name')}': seller_id invalide ({seller_id})")

        if needs_update:
            # Mettre à jour avec le vendeur par défaut
            result = await db.products.update_one(
                {"_id": product['_id']},
                {"$set": {"sellerId": default_seller_id}}
            )
            if result.modified_count > 0:
                updated_count += 1
                print(f"  -> Mis a jour avec {default_seller_id}")

    print(f"\n{updated_count} produit(s) mis a jour")

    # Vérification finale
    print("\nVerification finale:")
    products_after = await db.products.find().to_list(1000)
    for product in products_after:
        seller_id = product.get('sellerId')
        if seller_id:
            try:
                seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
                if seller:
                    print(f"  - {product.get('name')}: {seller.get('businessName', seller.get('name', 'N/A'))}")
                else:
                    print(f"  - {product.get('name')}: ERREUR - Vendeur non trouve")
            except Exception as e:
                print(f"  - {product.get('name')}: ERREUR - {str(e)}")
        else:
            print(f"  - {product.get('name')}: ERREUR - Pas de sellerId")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix_seller_ids())
