import requests
import json

# Login admin first
login_response = requests.post(
    'http://localhost:8001/api/auth/admin/login',
    json={'username': 'admin', 'password': 'admin123'}
)

if login_response.status_code == 200:
    token = login_response.json()['token']
    print("Login reussi!\n")

    # Get products
    headers = {'Authorization': f'Bearer {token}'}
    products_response = requests.get(
        'http://localhost:8001/api/admin/products',
        headers=headers
    )

    if products_response.status_code == 200:
        products = products_response.json()
        print(f"Nombre de produits: {len(products)}\n")

        if products:
            print("Premier produit:")
            print(json.dumps(products[0], indent=2, ensure_ascii=False))
    else:
        print(f"Erreur products: {products_response.status_code}")
        print(products_response.text)
else:
    print(f"Erreur login: {login_response.status_code}")
    print(login_response.text)
