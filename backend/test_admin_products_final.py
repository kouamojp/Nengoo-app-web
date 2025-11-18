"""
Test final de l'endpoint admin/products
"""
import requests
import json
import time

# Attendre que le serveur soit pret
print("Attente du serveur...")
time.sleep(5)

# Créer un admin temporaire
print("\n1. Verification de la connexion au serveur...")
try:
    response = requests.get('http://localhost:8001/api/categories', timeout=5)
    print(f"Serveur OK! Status: {response.status_code}")
except Exception as e:
    print(f"Serveur non accessible: {e}")
    exit(1)

# Pour tester, on simule une requête sans auth pour voir le format d'erreur
print("\n2. Test de l'endpoint /api/admin/products (sans auth)...")
try:
    response = requests.get('http://localhost:8001/api/admin/products', timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Erreur: {e}")

# Essayer avec les credentials par defaut
print("\n3. Tentative de login admin...")
try:
    login_response = requests.post(
        'http://localhost:8001/api/auth/admin/login',
        json={'username': 'admin', 'password': 'admin123'},
        timeout=5
    )
    print(f"Login status: {login_response.status_code}")

    if login_response.status_code == 200:
        login_data = login_response.json()
        print(f"Login data keys: {login_data.keys()}")

        if 'access_token' in login_data:
            token = login_data['access_token']
        elif 'token' in login_data:
            token = login_data['token']
        else:
            print("Pas de token dans la réponse")
            print(f"Réponse complète: {login_data}")
            exit(1)

        print(f"Token obtenu: {token[:20]}...")

        # Maintenant tester l'endpoint products
        print("\n4. Test de /api/admin/products avec auth...")
        headers = {'Authorization': f'Bearer {token}'}
        products_response = requests.get(
            'http://localhost:8001/api/admin/products',
            headers=headers,
            timeout=10
        )

        print(f"Status: {products_response.status_code}")

        if products_response.status_code == 200:
            products = products_response.json()
            print(f"\nNombre de produits: {len(products)}")

            if products:
                print("\nPremier produit:")
                first_product = products[0]
                print(f"  Nom: {first_product.get('name')}")
                print(f"  sellerId: {first_product.get('sellerId')}")
                print(f"  sellerName: {first_product.get('sellerName')}")

                print("\nTous les produits:")
                for p in products:
                    print(f"  - {p.get('name')}: {p.get('sellerName', 'PAS DE SELLERNAME!')}")
        else:
            print(f"Erreur: {products_response.text}")
    else:
        print(f"Login echoue: {login_response.text}")
except Exception as e:
    print(f"Erreur: {e}")
    import traceback
    traceback.print_exc()
