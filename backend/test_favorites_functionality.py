"""
Test script for favorites functionality
Tests the interaction endpoints for favorite products
"""
import requests
import json
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8001"

def test_favorites():
    print("=" * 60)
    print("Testing Favorites Functionality")
    print("=" * 60)

    # Test data
    test_buyer_id = "test_buyer_123"
    test_product_id = None

    # 1. Get all products to find a test product
    print("\n1. Getting products...")
    response = requests.get(f"{BASE_URL}/api/products")
    if response.status_code == 200:
        products = response.json()
        if products and len(products) > 0:
            test_product_id = products[0]["id"]
            print(f"✓ Found test product: {test_product_id}")
            print(f"  Product name: {products[0].get('name', 'N/A')}")
        else:
            print("✗ No products found. Please add products first.")
            return
    else:
        print(f"✗ Failed to get products: {response.status_code}")
        return

    # 2. Create a favorite interaction
    print(f"\n2. Adding product to favorites...")
    headers = {"X-Buyer-Id": test_buyer_id}
    interaction_data = {
        "isFavourite": True,
        "rating": 5,
        "interaction": "VIEW"
    }

    response = requests.post(
        f"{BASE_URL}/api/interaction/{test_product_id}",
        json=interaction_data,
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Product added to favorites")
        print(f"  Response: {json.dumps(result.get('data', {}), indent=2)}")

        # Check if isFavourite is in response
        if 'data' in result and 'isFavourite' in result['data']:
            print(f"  ✓ Backend returns 'isFavourite': {result['data']['isFavourite']}")
        else:
            print(f"  ✗ Backend does not return 'isFavourite' field")
    else:
        print(f"✗ Failed to add to favorites: {response.status_code}")
        print(f"  Error: {response.text}")
        return

    # 3. Get user interactions
    print(f"\n3. Getting user interactions...")
    response = requests.get(
        f"{BASE_URL}/api/interactions/user?page=0&size=8",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ User interactions retrieved")

        if 'data' in result and 'content' in result['data']:
            interactions = result['data']['content']
            print(f"  Total interactions: {len(interactions)}")

            # Check favorites
            favorites = [i for i in interactions if i.get('isFavourite', False)]
            print(f"  Total favorites: {len(favorites)}")

            if favorites:
                print(f"\n  Favorite products:")
                for fav in favorites:
                    product = fav.get('product', {})
                    print(f"    - {product.get('name', 'N/A')} (isFavourite: {fav.get('isFavourite')})")

            # Check field name consistency
            if interactions:
                first = interactions[0]
                if 'isFavourite' in first:
                    print(f"  ✓ Backend uses 'isFavourite' (with u)")
                elif 'isFavorite' in first:
                    print(f"  ⚠ Backend uses 'isFavorite' (without u)")
                elif 'favorite' in first:
                    print(f"  ⚠ Backend uses 'favorite'")
        else:
            print(f"  ✗ Invalid response structure")
    else:
        print(f"✗ Failed to get user interactions: {response.status_code}")
        print(f"  Error: {response.text}")
        return

    # 4. Toggle favorite off
    print(f"\n4. Removing product from favorites...")
    interaction_data["isFavourite"] = False

    response = requests.post(
        f"{BASE_URL}/api/interaction/{test_product_id}",
        json=interaction_data,
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Product removed from favorites")
        print(f"  isFavourite: {result.get('data', {}).get('isFavourite', 'N/A')}")
    else:
        print(f"✗ Failed to remove from favorites: {response.status_code}")

    # 5. Verify removal
    print(f"\n5. Verifying favorites list...")
    response = requests.get(
        f"{BASE_URL}/api/interactions/user?page=0&size=8",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        interactions = result.get('data', {}).get('content', [])
        favorites = [i for i in interactions if i.get('isFavourite', False)]
        print(f"✓ Total favorites after removal: {len(favorites)}")

    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_favorites()
    except Exception as e:
        print(f"\n✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
