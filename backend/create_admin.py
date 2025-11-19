"""
Script pour créer un administrateur dans la base de données MongoDB
Usage: python create_admin.py
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
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin():
    """Create an admin user in the database"""

    print("=== Création d'un administrateur Nengoo ===\n")

    # Connect to MongoDB
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Get admin details from user
    print("Entrez les informations de l'administrateur:")
    username = input("Nom d'utilisateur: ").strip()

    if not username:
        print("Erreur: Le nom d'utilisateur ne peut pas être vide")
        return

    # Check if admin already exists
    existing_admin = await db.admins.find_one({"username": username})
    if existing_admin:
        print(f"\nErreur: Un administrateur avec le nom '{username}' existe déjà")
        client.close()
        return

    email = input("Email: ").strip()

    if not email:
        print("Erreur: L'email ne peut pas être vide")
        return

    # Check if email already exists
    existing_email = await db.admins.find_one({"email": email})
    if existing_email:
        print(f"\nErreur: Un administrateur avec l'email '{email}' existe déjà")
        client.close()
        return

    password = input("Mot de passe: ").strip()

    if not password:
        print("Erreur: Le mot de passe ne peut pas être vide")
        return

    if len(password) < 6:
        print("Erreur: Le mot de passe doit contenir au moins 6 caractères")
        return

    confirm_password = input("Confirmer le mot de passe: ").strip()

    if password != confirm_password:
        print("Erreur: Les mots de passe ne correspondent pas")
        return

    # Create admin document
    admin_dict = {
        "username": username,
        "email": email,
        "password": pwd_context.hash(password),
        "role": "admin",
        "createdDate": datetime.now(timezone.utc).isoformat()
    }

    # Insert into database
    result = await db.admins.insert_one(admin_dict)

    print(f"\n✅ Administrateur créé avec succès!")
    print(f"ID: {result.inserted_id}")
    print(f"Nom d'utilisateur: {username}")
    print(f"Email: {email}")
    print(f"\nVous pouvez maintenant vous connecter à l'administration avec ces identifiants.")
    print(f"URL: http://localhost:3000/admin/login")

    # Close the connection
    client.close()


if __name__ == "__main__":
    asyncio.run(create_admin())
