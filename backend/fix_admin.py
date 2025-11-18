"""
Script pour corriger/recréer l'administrateur
Usage: python fix_admin.py
"""

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pathlib import Path
from datetime import datetime, timezone

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'nengoo')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def fix_admin():
    """Fix or recreate admin user"""

    print("=" * 60)
    print("   CORRECTION ADMIN - NENGOO")
    print("=" * 60)
    print()

    try:
        # Connect to MongoDB
        print("Connexion à MongoDB...")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)

        # Test connection
        await client.admin.command('ping')
        print("✅ Connexion réussie\n")

        db = client[db_name]

        # Check existing admins
        print("Vérification des admins existants...")
        admin_count = await db.admins.count_documents({})
        print(f"Nombre d'admins trouvés: {admin_count}\n")

        if admin_count > 0:
            print("Affichage des admins existants:")
            admins = await db.admins.find().to_list(100)
            for i, admin in enumerate(admins, 1):
                print(f"\n  Admin #{i}:")
                print(f"  - Username: {admin.get('username', 'N/A')}")
                print(f"  - Email: {admin.get('email', 'N/A')}")
                print(f"  - Password field exists: {'✅' if 'password' in admin else '❌'}")
                if 'password' in admin and admin['password']:
                    print(f"  - Password hash valid: {'✅' if admin['password'].startswith('$2b$') else '❌'}")

            print("\n" + "-" * 60)
            choice = input("\nVoulez-vous SUPPRIMER tous les admins et en créer un nouveau? (oui/non): ").strip().lower()

            if choice != 'oui':
                print("\nOpération annulée.")
                client.close()
                return

            # Delete all admins
            print("\nSuppression de tous les admins...")
            result = await db.admins.delete_many({})
            print(f"✅ {result.deleted_count} admin(s) supprimé(s)\n")

        # Create new admin
        print("Création d'un nouvel administrateur...")
        print()

        username = input("Nom d'utilisateur (appuyez sur Entrée pour 'admin'): ").strip() or "admin"
        email = input("Email (appuyez sur Entrée pour 'admin@nengoo.com'): ").strip() or "admin@nengoo.com"
        password = input("Mot de passe (appuyez sur Entrée pour 'admin123'): ").strip() or "admin123"

        print("\nCréation de l'admin avec:")
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print()

        # Hash password
        print("Hash du mot de passe...")
        password_hash = pwd_context.hash(password)
        print(f"Hash créé: {password_hash[:60]}...\n")

        # Create admin document
        admin_dict = {
            "username": username,
            "email": email,
            "password": password_hash,
            "role": "admin",
            "createdDate": datetime.now(timezone.utc).isoformat()
        }

        # Insert into database
        result = await db.admins.insert_one(admin_dict)
        print(f"✅ Admin créé avec succès!")
        print(f"ID: {result.inserted_id}")

        # Verify
        print("\nVérification...")
        created_admin = await db.admins.find_one({"_id": result.inserted_id})

        if created_admin and "password" in created_admin:
            # Test password verification
            is_valid = pwd_context.verify(password, created_admin["password"])
            print(f"Test de vérification du mot de passe: {'✅ OK' if is_valid else '❌ ERREUR'}")

        print("\n" + "=" * 60)
        print("   ADMIN CRÉÉ AVEC SUCCÈS!")
        print("=" * 60)
        print(f"\nVous pouvez maintenant vous connecter sur:")
        print(f"  URL: http://localhost:3000/admin/login")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        print()

        client.close()

    except Exception as e:
        print(f"\n❌ ERREUR: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\nVérifiez que:")
        print("  1. MongoDB est en cours d'exécution")
        print("  2. Le fichier .env contient les bonnes informations")
        print("  3. Les dépendances sont installées (pip install -r requirements.txt)")


if __name__ == "__main__":
    asyncio.run(fix_admin())
