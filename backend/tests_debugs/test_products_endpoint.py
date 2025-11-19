import requests
import json

try:
    response = requests.get('http://localhost:8001/api/products')
    print(f'Status: {response.status_code}')

    if response.status_code == 200:
        products = response.json()
        print(f'\nNombre de produits: {len(products)}')
        print('\nProduits:')
        for product in products:
            print(f"  - {product.get('name', 'Sans nom')} (Status: {product.get('status', 'N/A')})")
    else:
        print(f'Erreur: {response.text}')
except Exception as e:
    print(f'Erreur de connexion: {str(e)}')
