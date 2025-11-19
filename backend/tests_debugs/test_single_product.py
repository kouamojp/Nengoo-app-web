import requests
import json

# Tester avec le premier produit
try:
    # D'abord obtenir tous les produits pour avoir un ID
    response = requests.get('http://localhost:8001/api/products')
    if response.status_code == 200:
        products = response.json()
        if products:
            product_id = products[0]['id']
            print(f"Test avec le produit ID: {product_id}")
            print(f"Nom: {products[0]['name']}\n")

            # Maintenant tester l'endpoint individuel
            detail_response = requests.get(f'http://localhost:8001/api/products/{product_id}')
            print(f"Status: {detail_response.status_code}")

            if detail_response.status_code == 200:
                product_detail = detail_response.json()
                print("\nDetails du produit:")
                print(json.dumps(product_detail, indent=2, ensure_ascii=False))
            else:
                print(f"Erreur: {detail_response.text}")
        else:
            print("Aucun produit trouve")
    else:
        print(f"Erreur lors de la recuperation des produits: {response.status_code}")
except Exception as e:
    print(f"Erreur: {str(e)}")
