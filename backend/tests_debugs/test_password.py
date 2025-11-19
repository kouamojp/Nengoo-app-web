"""
Script pour tester le hash et la vérification du mot de passe
"""

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'nengoo')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def test_password():
    """Test password hashing and verification"""

    print("=" * 60)
    print("   TEST MOT DE PASSE")
    print("=" * 60)
    print()

    try:
        # Connect to MongoDB
        print("1. Connexion à MongoDB...")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("   ✅ Connecté\n")

        db = client[db_name]

        # Get all admins
        print("2. Récupération des admins...")
        admins = await db.admins.find().to_list(100)
        print(f"   Nombre d'admins: {len(admins)}\n")

        if len(admins) == 0:
            print("   ❌ Aucun admin trouvé!\n")
            print("   Création d'un admin de test...")

            test_password = "admin123"
            test_hash = pwd_context.hash(test_password)

            new_admin = {
                "username": "admin",
                "email": "admin@nengoo.com",
                "password": test_hash,
                "role": "admin",
                "createdDate": "2025-01-01T00:00:00"
            }

            result = await db.admins.insert_one(new_admin)
            print(f"   ✅ Admin créé: {result.inserted_id}")

            # Re-fetch
            admins = await db.admins.find().to_list(100)

        # Test each admin
        for i, admin in enumerate(admins, 1):
            print(f"\n{'='*60}")
            print(f"Admin #{i}: {admin.get('username', 'N/A')}")
            print("="*60)

            stored_hash = admin.get('password', '')
            print(f"\nHash stocké: {stored_hash[:80] if stored_hash else 'VIDE'}...")

            if not stored_hash:
                print("❌ PAS DE MOT DE PASSE STOCKÉ!")
                continue

            # Test avec différents mots de passe
            test_passwords = ["admin123", "admin", "Admin123", "password"]

            print("\nTest de vérification:")
            for test_pwd in test_passwords:
                try:
                    is_valid = pwd_context.verify(test_pwd, stored_hash)
                    status = "✅ CORRECT" if is_valid else "❌ incorrect"
                    print(f"  '{test_pwd}': {status}")

                    if is_valid:
                        print(f"\n🎉 MOT DE PASSE TROUVÉ: '{test_pwd}'")
                        print(f"   Username: {admin.get('username')}")
                        print(f"   Utilisez ces identifiants pour vous connecter!")

                except Exception as e:
                    print(f"  '{test_pwd}': ❌ ERREUR - {str(e)}")

            # Si aucun mot de passe ne fonctionne, proposer de le réinitialiser
            print("\n" + "-"*60)
            choice = input(f"\nRéinitialiser le mot de passe de '{admin.get('username')}' à 'admin123'? (oui/non): ").strip().lower()

            if choice == 'oui':
                new_hash = pwd_context.hash("admin123")
                await db.admins.update_one(
                    {"_id": admin["_id"]},
                    {"$set": {"password": new_hash}}
                )
                print("✅ Mot de passe réinitialisé à 'admin123'")

                # Vérifier
                updated_admin = await db.admins.find_one({"_id": admin["_id"]})
                is_valid = pwd_context.verify("admin123", updated_admin["password"])
                print(f"Vérification: {'✅ OK' if is_valid else '❌ ERREUR'}")

        print("\n" + "="*60)
        print("   FIN DU TEST")
        print("="*60)

        client.close()

    except Exception as e:
        print(f"\n❌ ERREUR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_password())
