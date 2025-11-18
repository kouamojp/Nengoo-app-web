"""
Simple test sans authentification pour voir la structure
On va juste afficher les erreurs
"""
import requests

# Test sans auth pour voir l'erreur
print("Test de l'endpoint /api/admin/products sans auth:")
response = requests.get('http://localhost:8001/api/admin/products')
print(f"Status: {response.status_code}")
print(f"Response: {response.text[:500]}")

# Le test avec auth nécessite un admin valide, donc on ne le fait pas pour l'instant
# L'important est de voir si le serveur répond et comment
