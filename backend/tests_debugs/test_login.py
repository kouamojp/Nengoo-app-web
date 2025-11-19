"""
Script de test pour tester le login admin directement
"""

import requests
import json

API_URL = "http://localhost:8001/api/auth/admin/login"

print("=" * 60)
print("   TEST LOGIN ADMIN")
print("=" * 60)
print()

# Test data
login_data = {
    "username": "admin",
    "password": "admin123"
}

print(f"URL: {API_URL}")
print(f"Data: {json.dumps(login_data, indent=2)}")
print()

try:
    print("Envoi de la requête...")
    response = requests.post(API_URL, json=login_data)

    print(f"\nStatus Code: {response.status_code}")
    print(f"\nHeaders: {dict(response.headers)}")
    print(f"\nResponse:")

    try:
        data = response.json()
        print(json.dumps(data, indent=2))
    except:
        print(response.text)

    if response.status_code == 200:
        print("\n✅ LOGIN RÉUSSI!")
    else:
        print(f"\n❌ ERREUR {response.status_code}")

except requests.exceptions.ConnectionError:
    print("\n❌ Impossible de se connecter au serveur!")
    print("Assurez-vous que le backend est démarré sur http://localhost:8001")
except Exception as e:
    print(f"\n❌ ERREUR: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
