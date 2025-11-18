"""
Script pour corriger le statut de tous les produits en base de données
Tous les produits seront mis à "active"
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def fix_products_status():
    """Mettre à jour tous les produits pour avoir le statut 'active'"""

    print("🔍 Vérification des produits...")

    # Compter les produits avant
    total_products = await db.products.count_documents({})
    print(f"📊 Total de produits: {total_products}")

    # Compter les produits sans statut ou inactifs
    problematic_products = await db.products.count_documents({
        "$or": [
            {"status": {"$exists": False}},
            {"status": None},
            {"status": "inactive"},
            {"status": ""}
        ]
    })

    print(f"⚠️  Produits sans statut actif: {problematic_products}")

    if problematic_products == 0:
        print("✅ Tous les produits ont déjà le statut 'active'!")
        return

    # Mise à jour
    print("\n🔧 Correction en cours...")
    result = await db.products.update_many(
        {
            "$or": [
                {"status": {"$exists": False}},
                {"status": None},
                {"status": "inactive"},
                {"status": ""}
            ]
        },
        {"$set": {"status": "active"}}
    )

    print(f"✅ {result.modified_count} produit(s) mis à jour avec succès!")

    # Vérification finale
    active_products = await db.products.count_documents({"status": "active"})
    print(f"\n📈 Résultat final:")
    print(f"   - Total de produits: {total_products}")
    print(f"   - Produits actifs: {active_products}")

    # Afficher quelques exemples
    print("\n📦 Exemples de produits actifs:")
    products = await db.products.find({"status": "active"}).limit(5).to_list(5)
    for product in products:
        print(f"   - {product.get('name', 'Sans nom')} (ID: {product['_id']})")


async def main():
    print("=" * 60)
    print("🛠️  CORRECTION DU STATUT DES PRODUITS")
    print("=" * 60)
    print()

    try:
        await fix_products_status()
        print("\n" + "=" * 60)
        print("✅ Correction terminée avec succès!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Erreur: {str(e)}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
