"""
Script pour vérifier les utilisateurs dans la base de données
et voir le format des numéros WhatsApp
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def check_users():
    # Connexion à MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]

    print("=" * 60)
    print("VERIFICATION DES UTILISATEURS")
    print("=" * 60)

    # Vérifier les sellers
    print("\n[VENDEURS (Sellers)]")
    print("-" * 60)
    sellers = await db.sellers.find().to_list(100)
    for seller in sellers:
        print(f"WhatsApp: '{seller.get('whatsapp')}'")
        print(f"  Nom: {seller.get('name', 'N/A')}")
        print(f"  Business: {seller.get('businessName', 'N/A')}")
        print(f"  Status: {seller.get('status', 'N/A')}")
        print(f"  Format avec espace: {' ' in seller.get('whatsapp', '')}")
        print()

    # Vérifier les buyers
    print("\n[ACHETEURS (Buyers)]")
    print("-" * 60)
    buyers = await db.users.find({"type": "buyer"}).to_list(100)
    for buyer in buyers:
        print(f"WhatsApp: '{buyer.get('whatsapp')}'")
        print(f"  Nom: {buyer.get('name', 'N/A')}")
        print(f"  Format avec espace: {' ' in buyer.get('whatsapp', '')}")
        print()

    # Chercher spécifiquement l'utilisateur
    print("\n[RECHERCHE SPECIFIQUE: +237 690703689]")
    print("-" * 60)

    # Avec espace
    seller_with_space = await db.sellers.find_one({"whatsapp": "+237 690703689"})
    if seller_with_space:
        print("[OK] Trouvé avec ESPACE: +237 690703689")
        print(f"   ID: {seller_with_space.get('id')}")
        print(f"   Nom: {seller_with_space.get('name')}")
    else:
        print("[NON] NON trouvé avec espace")

    # Sans espace
    seller_without_space = await db.sellers.find_one({"whatsapp": "+237690703689"})
    if seller_without_space:
        print("[OK] Trouvé sans espace: +237690703689")
        print(f"   ID: {seller_without_space.get('id')}")
        print(f"   Nom: {seller_without_space.get('name')}")
    else:
        print("[NON] NON trouvé sans espace")

    print("\n" + "=" * 60)
    print("FIN DE LA VÉRIFICATION")
    print("=" * 60)

    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
