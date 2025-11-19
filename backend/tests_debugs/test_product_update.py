"""
Test de la mise à jour du vendeur d'un produit
"""
import requests
import time

API_BASE = 'http://localhost:8001/api'

print("=== TEST DE MISE A JOUR DU VENDEUR ===\n")

# Attendre que le serveur soit prêt
print("1. Attente du serveur...")
time.sleep(2)

# Login admin
print("\n2. Login admin...")
login_response = requests.post(
    f'{API_BASE}/auth/admin/login',
    json={'username': 'admin', 'password': 'admin123'},
    timeout=5
)

if login_response.status_code != 200:
    print(f"ERREUR: Login echoue - {login_response.text}")
    exit(1)

token = login_response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print("Login reussi!")

# Récupérer tous les produits
print("\n3. Recuperation des produits...")
products_response = requests.get(f'{API_BASE}/admin/products', headers=headers, timeout=5)

if products_response.status_code != 200:
    print(f"ERREUR: Impossible de recuperer les produits - {products_response.text}")
    exit(1)

products = products_response.json()
print(f"Nombre de produits: {len(products)}")

if not products:
    print("ERREUR: Aucun produit dans la base")
    exit(1)

# Prendre le premier produit
test_product = products[0]
print(f"\nProduit de test: {test_product['name']}")
print(f"  sellerId actuel: {test_product.get('sellerId', 'N/A')}")
print(f"  Vendeur actuel: {test_product.get('sellerName', 'N/A')}")

# Récupérer tous les vendeurs
print("\n4. Recuperation des vendeurs...")
sellers_response = requests.get(f'{API_BASE}/admin/sellers', headers=headers, timeout=5)

if sellers_response.status_code != 200:
    print(f"ERREUR: Impossible de recuperer les vendeurs - {sellers_response.text}")
    exit(1)

sellers = sellers_response.json()
approved_sellers = [s for s in sellers if s.get('status') == 'approved']
print(f"Nombre de vendeurs approuves: {len(approved_sellers)}")

if len(approved_sellers) < 2:
    print("ATTENTION: Il faut au moins 2 vendeurs pour tester le changement")
    print("Vendeurs disponibles:")
    for s in approved_sellers:
        print(f"  - {s.get('businessName', s.get('name'))}: {s.get('id')}")
    exit(1)

# Trouver un vendeur différent
current_seller_id = test_product.get('sellerId')
new_seller = None
for seller in approved_sellers:
    if seller['id'] != current_seller_id:
        new_seller = seller
        break

if not new_seller:
    print("ERREUR: Impossible de trouver un vendeur different")
    exit(1)

print(f"\nNouveau vendeur cible: {new_seller.get('businessName', new_seller.get('name'))}")
print(f"  ID: {new_seller['id']}")

# Mettre à jour le produit avec le nouveau vendeur
print(f"\n5. Mise a jour du produit avec le nouveau vendeur...")
update_data = {
    'sellerId': new_seller['id']
}

update_response = requests.put(
    f"{API_BASE}/admin/products/{test_product['id']}",
    json=update_data,
    headers=headers,
    timeout=5
)

if update_response.status_code != 200:
    print(f"ERREUR: Mise a jour echouee - {update_response.text}")
    exit(1)

print("Mise a jour reussie!")

# Récupérer à nouveau le produit pour vérifier
print("\n6. Verification de la mise a jour...")
time.sleep(1)  # Attendre un peu

products_response = requests.get(f'{API_BASE}/admin/products', headers=headers, timeout=5)
updated_products = products_response.json()
updated_product = None

for p in updated_products:
    if p['id'] == test_product['id']:
        updated_product = p
        break

if not updated_product:
    print("ERREUR: Produit non trouve apres mise a jour")
    exit(1)

print(f"\nProduit apres mise a jour: {updated_product['name']}")
print(f"  sellerId: {updated_product.get('sellerId', 'N/A')}")
print(f"  Vendeur: {updated_product.get('sellerName', 'N/A')}")

# Vérifier que le changement a bien été effectué
if updated_product.get('sellerId') == new_seller['id']:
    print("\n" + "="*50)
    print("✓ TEST REUSSI!")
    print("="*50)
    print(f"Le vendeur a ete change de:")
    print(f"  '{test_product.get('sellerName')}' -> '{updated_product.get('sellerName')}'")
else:
    print("\n" + "="*50)
    print("✗ TEST ECHOUE!")
    print("="*50)
    print(f"Le sellerId n'a pas ete mis a jour")
    print(f"  Attendu: {new_seller['id']}")
    print(f"  Obtenu: {updated_product.get('sellerId')}")
