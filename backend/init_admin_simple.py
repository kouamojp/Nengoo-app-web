"""
Script simple pour créer l'administrateur par défaut
Usage: python init_admin_simple.py
"""

import requests
import json

API_URL = "http://localhost:8001/api/admin/init-default"

print("=" * 50)
print("   Initialisation Admin Nengoo - Méthode Simple")
print("=" * 50)
print()

try:
    print("Création de l'administrateur par défaut...")
    print()

    response = requests.post(API_URL)

    if response.status_code == 200:
        data = response.json()
        print("✅ " + data['message'])
        print()
        print("Identifiants de connexion:")
        print(f"  • Username: {data['credentials']['username']}")
        print(f"  • Password: {data['credentials']['password']}")
        print()
        print("Accès: http://localhost:3000/admin/login")
        print()
        print("⚠️  " + data['credentials']['warning'])
    else:
        error_data = response.json()
        print(f"❌ Erreur: {error_data.get('detail', 'Erreur inconnue')}")

except requests.exceptions.ConnectionError:
    print("❌ Erreur: Impossible de se connecter au serveur backend")
    print("   Assurez-vous que le serveur est démarré sur http://localhost:8001")
except Exception as e:
    print(f"❌ Erreur: {str(e)}")

print()
print("=" * 50)
input("Appuyez sur Entrée pour quitter...")
