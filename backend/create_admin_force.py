"""
Script pour créer/recréer l'admin en forçant - Sans warnings
"""

import asyncio
import os
import warnings
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pathlib import Path

# Ignorer tous les warnings
warnings.filterwarnings('ignore')

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'nengoo')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin_force():
    """Create admin by force"""

    print("=" * 70)
    print("   CRÉATION ADMIN FORCÉE - NENGOO")
    print("=" * 70)
    print()

    try:
        # Connect to MongoDB
        print("1. Connexion à MongoDB...")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("   ✅ Connecté\n")

        db = client[db_name]

        # Delete ALL existing admins
        print("2. Suppression de tous les admins existants...")
        result = await db.admins.delete_many({})
        print(f"   ✅ {result.deleted_count} admin(s) supprimé(s)\n")

        # Create new admin
        print("3. Création du nouvel admin...")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Email: admin@nengoo.com\n")

        # Hash password
        print("4. Génération du hash...")
        password_hash = pwd_context.hash("admin123")
        print(f"   ✅ Hash généré\n")

        # Create admin document
        admin_doc = {
            "username": "admin",
            "email": "admin@nengoo.com",
            "password": password_hash,
            "role": "admin",
            "createdDate": "2025-01-17T00:00:00"
        }

        # Insert
        print("5. Insertion dans la base de données...")
        result = await db.admins.insert_one(admin_doc)
        print(f"   ✅ Admin créé avec ID: {result.inserted_id}\n")

        # Verify
        print("6. Vérification...")
        admin = await db.admins.find_one({"username": "admin"})

        if not admin:
            print("   ❌ ERREUR: Admin non trouvé après création!")
            client.close()
            return

        print(f"   ✅ Admin trouvé: {admin.get('username')}")

        # Test password
        print("\n7. Test du mot de passe...")
        try:
            is_valid = pwd_context.verify("admin123", admin["password"])

            if is_valid:
                print("   ✅ Mot de passe valide!")
            else:
                print("   ❌ ERREUR: Mot de passe invalide!")
                client.close()
                return

        except Exception as e:
            print(f"   ❌ ERREUR lors du test: {str(e)}")
            client.close()
            return

        print("\n" + "=" * 70)
        print("   ✅✅✅ SUCCÈS TOTAL! ✅✅✅")
        print("=" * 70)
        print()
        print("Vous pouvez maintenant vous connecter:")
        print()
        print("  🌐 URL:      http://localhost:3000/admin/login")
        print("  👤 Username: admin")
        print("  🔑 Password: admin123")
        print()
        print("⚠️  N'oubliez pas de redémarrer le backend si nécessaire!")
        print()
        print("=" * 70)

        client.close()

    except Exception as e:
        print(f"\n❌ ERREUR CRITIQUE: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print()
    asyncio.run(create_admin_force())
    print()
    input("Appuyez sur Entrée pour quitter...")
