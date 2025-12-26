import os
import re
import unicodedata
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')

if not MONGO_URL or not DB_NAME:
    print("❌ Erreur: MONGO_URL ou DB_NAME non trouvés dans le fichier .env")
    exit(1)

def generate_slug(text):
    """Transforme un texte en slug URL-friendly."""
    if not text:
        return "produit"
    # Normalise les caractères spéciaux (accents etc)
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    # Supprime les caractères non-alphanumériques
    text = re.sub(r'[^\w\s-]', '', text).lower().strip()
    # Remplace les espaces et underscores par des tirets
    return re.sub(r'[-\s]+', '-', text)

def get_unique_slug(db, name, product_id):
    """Génère un slug unique en vérifiant l'existence dans la base."""
    base_slug = generate_slug(name)
    slug = base_slug
    counter = 1
    
    # On cherche si un AUTRE produit a déjà ce slug
    while db.products.find_one({"slug": slug, "id": {"$ne": product_id}}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

def migrate():
    print(f"🚀 Connexion à la base de données: {DB_NAME}...")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # On récupère tous les produits
    products = list(db.products.find())
    print(f"📦 Analyse de {len(products)} produits...")
    
    updated_count = 0
    for p in products:
        # On génère un slug systématiquement ou seulement si manquant
        # Ici, on le fait pour tous pour s'assurer de la cohérence
        new_slug = get_unique_slug(db, p.get('name', 'produit'), p.get('id'))
        
        # Mise à jour si le slug est différent ou inexistant
        if p.get('slug') != new_slug:
            db.products.update_one(
                {"_id": p["_id"]},
                {"$set": {"slug": new_slug}}
            )
            updated_count += 1
            print(f"✅ Mis à jour: '{p.get('name')}' -> {new_slug}")

    print(f"\n✨ Migration terminée !")
    print(f"📊 Produits mis à jour : {updated_count}")
    client.close()

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"❌ Une erreur est survenue lors de la migration : {e}")
