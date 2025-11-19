"""
Script de diagnostic pour vérifier la configuration admin
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


async def debug_admin():
    """Debug admin configuration"""

    print("=" * 60)
    print("   DIAGNOSTIC ADMIN - NENGOO")
    print("=" * 60)
    print()

    try:
        # Test MongoDB connection
        print("1. Test connexion MongoDB...")
        print(f"   URL: {mongo_url}")
        print(f"   Base: {db_name}")

        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)

        # Test connection
        await client.admin.command('ping')
        print("   ✅ Connexion MongoDB OK\n")

        db = client[db_name]

        # Check admins collection
        print("2. Vérification collection admins...")
        admin_count = await db.admins.count_documents({})
        print(f"   Nombre d'admins: {admin_count}")

        if admin_count == 0:
            print("   ❌ Aucun admin trouvé!\n")
            print("   Solution: Exécutez 'python init_admin_simple.py'\n")
            client.close()
            return

        # List all admins
        print("\n3. Liste des administrateurs:")
        admins = await db.admins.find().to_list(100)

        for i, admin in enumerate(admins, 1):
            print(f"\n   Admin #{i}:")
            print(f"   - Username: {admin.get('username', 'N/A')}")
            print(f"   - Email: {admin.get('email', 'N/A')}")
            print(f"   - Role: {admin.get('role', 'N/A')}")
            print(f"   - Password (hashé): {admin.get('password', 'N/A')[:60]}...")

            # Test password
            if admin.get('password'):
                print(f"   - Format hash: {'✅ OK' if admin['password'].startswith('$2b$') else '❌ Invalide'}")

        # Test password hashing
        print("\n4. Test du système de hash de mot de passe...")
        test_password = "admin123"
        test_hash = pwd_context.hash(test_password)
        print(f"   Password: {test_password}")
        print(f"   Hash: {test_hash[:60]}...")

        # Verify
        is_valid = pwd_context.verify(test_password, test_hash)
        print(f"   Vérification: {'✅ OK' if is_valid else '❌ ERREUR'}")

        # Test with actual admin password
        if admins:
            print("\n5. Test connexion avec le premier admin...")
            first_admin = admins[0]
            username = first_admin.get('username')
            stored_hash = first_admin.get('password')

            print(f"   Username: {username}")
            print(f"   Test avec password: admin123")

            try:
                is_correct = pwd_context.verify("admin123", stored_hash)
                print(f"   Résultat: {'✅ Mot de passe correct!' if is_correct else '❌ Mot de passe incorrect'}")

                if not is_correct:
                    print("\n   ⚠️  Le mot de passe stocké ne correspond pas à 'admin123'")
                    print("   Avez-vous créé l'admin avec un autre mot de passe?")

            except Exception as e:
                print(f"   ❌ Erreur lors de la vérification: {str(e)}")
                print("   Le hash du mot de passe est peut-être corrompu")

        print("\n" + "=" * 60)
        print("   FIN DU DIAGNOSTIC")
        print("=" * 60)

        client.close()

    except Exception as e:
        print(f"\n❌ ERREUR: {str(e)}")
        print("\nVérifiez que:")
        print("  1. MongoDB est en cours d'exécution")
        print("  2. Le fichier .env contient les bonnes informations")
        print("  3. Les dépendances sont installées (pip install -r requirements.txt)")


if __name__ == "__main__":
    asyncio.run(debug_admin())
