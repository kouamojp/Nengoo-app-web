#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script pour initialiser les paramètres de la page About
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()

async def init_about_page_settings():
    """Initialise les paramètres de la page About"""

    mongo_uri = os.getenv('MONGO_URI', os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
    db_name = os.getenv('DB_NAME', 'nengoo_marketplace')

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    print("=" * 80)
    print("INITIALISATION DES PARAMÈTRES DE LA PAGE ABOUT")
    print("=" * 80)

    # Vérifier si les paramètres existent déjà
    existing = await db.about_page_settings.find_one({"id": "about_page_settings"})

    if existing:
        print("\n[!] Les parametres existent deja dans la base de donnees:")
        print(f"   - Image: {existing.get('mission_image_url', 'N/A')[:80]}")
        print(f"   - Titre: {existing.get('mission_title', 'N/A')}")
        print(f"   - Derniere mise a jour: {existing.get('last_updated', 'N/A')}")

        response = input("\nVoulez-vous remplacer par les valeurs par defaut ? (o/N): ")
        if response.lower() != 'o':
            print("\n[OK] Annule. Les parametres existants sont conserves.")
            client.close()
            return

    # Créer les paramètres par défaut
    default_settings = {
        "id": "about_page_settings",
        "mission_image_url": "https://images.pexels.com/photos/13086663/pexels-photo-13086663.jpeg",
        "mission_title": "Notre Mission",
        "mission_text_1": "Nengoo a été créé avec pour mission de connecter les consommateurs camerounais aux meilleurs produits locaux et internationaux, tout en soutenant l'économie locale et l'artisanat traditionnel.",
        "mission_text_2": "Nous croyons fermement au potentiel du commerce électronique pour transformer l'économie camerounaise et offrir de nouvelles opportunités aux entrepreneurs locaux.",
        "last_updated": datetime.utcnow(),
        "updated_by": None
    }

    # Insérer ou mettre à jour
    result = await db.about_page_settings.replace_one(
        {"id": "about_page_settings"},
        default_settings,
        upsert=True
    )

    if result.upserted_id or result.modified_count > 0:
        print("\n[OK] Parametres de la page About initialises avec succes!")
        print("\nValeurs par defaut:")
        print(f"   - Image: {default_settings['mission_image_url']}")
        print(f"   - Titre: {default_settings['mission_title']}")
        print(f"   - Texte 1: {default_settings['mission_text_1'][:80]}...")
        print(f"   - Texte 2: {default_settings['mission_text_2'][:80]}...")
    else:
        print("\n[ERROR] Erreur lors de l'initialisation")

    print("\n" + "=" * 80)
    print("NEXT STEPS")
    print("=" * 80)
    print("\n1. Redémarrer le serveur backend:")
    print("   cd backend && python server.py")
    print("\n2. Se connecter en tant que super admin:")
    print("   https://www.nengoo.com/admin/login")
    print("\n3. Aller dans 'Gestion Page À propos'")
    print("\n4. Modifier l'image et les textes selon vos besoins")
    print("\n" + "=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(init_about_page_settings())
