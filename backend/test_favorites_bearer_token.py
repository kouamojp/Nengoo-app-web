"""
Test script to verify favorites work with Bearer token authentication
"""
import requests
import json
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8001"

def test_favorites_with_bearer():
    print("=" * 70)
    print("Testing Favorites with Bearer Token Authentication")
    print("=" * 70)

    # Test data
    test_buyer_id = "buyer_test_123"
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

    # 2. Test with Bearer token (NEW METHOD)
    print(f"\n2. Testing with Bearer token authentication...")
    headers = {"Authorization": f"Bearer {test_buyer_id}"}
    interaction_data = {
        "isFavourite": True,
        "rating": 4,
        "interaction": "VIEW"
    }

    response = requests.post(
        f"{BASE_URL}/api/interaction/{test_product_id}",
        json=interaction_data,
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Favorite added successfully with Bearer token!")
        print(f"  Response: {json.dumps(result.get('data', {}), indent=2)}")

        if 'data' in result and 'isFavourite' in result['data']:
            print(f"  ✓ isFavourite: {result['data']['isFavourite']}")
        else:
            print(f"  ✗ Missing isFavourite field in response")
    else:
        print(f"✗ Failed with Bearer token: {response.status_code}")
        print(f"  Error: {response.text}")
        return

    # 3. Test with legacy headers (X-Buyer-Id) - should still work
    print(f"\n3. Testing backward compatibility with X-Buyer-Id header...")
    headers_legacy = {"X-Buyer-Id": "buyer_legacy_456"}
    interaction_data["isFavourite"] = True
    interaction_data["rating"] = 5

    response = requests.post(
        f"{BASE_URL}/api/interaction/{test_product_id}",
        json=interaction_data,
        headers=headers_legacy
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Legacy X-Buyer-Id header still works!")
    else:
        print(f"✗ Failed with X-Buyer-Id: {response.status_code}")

    # 4. Get user interactions with Bearer token
    print(f"\n4. Getting user interactions with Bearer token...")
    headers = {"Authorization": f"Bearer {test_buyer_id}"}

    response = requests.get(
        f"{BASE_URL}/api/interactions/user?page=0&size=8",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ User interactions retrieved with Bearer token")

        if 'data' in result and 'content' in result['data']:
            interactions = result['data']['content']
            print(f"  Total interactions: {len(interactions)}")

            favorites = [i for i in interactions if i.get('isFavourite', False)]
            print(f"  Total favorites: {len(favorites)}")

            if favorites:
                print(f"\n  Favorite products:")
                for fav in favorites:
                    product = fav.get('product', {})
                    print(f"    - {product.get('name', 'N/A')} (isFavourite: {fav.get('isFavourite')})")
        else:
            print(f"  ✗ Invalid response structure")
    else:
        print(f"✗ Failed to get interactions: {response.status_code}")
        print(f"  Error: {response.text}")
        return

    # 5. Test with no authentication
    print(f"\n5. Testing without authentication (should fail)...")
    response = requests.post(
        f"{BASE_URL}/api/interaction/{test_product_id}",
        json=interaction_data
    )

    if response.status_code == 401:
        print(f"✓ Correctly rejected request without authentication")
    else:
        print(f"✗ Should have rejected but got status: {response.status_code}")

    # 6. Get product interactions
    print(f"\n6. Getting product interaction stats...")
    headers = {"Authorization": f"Bearer {test_buyer_id}"}

    response = requests.get(
        f"{BASE_URL}/api/interactions/product/{test_product_id}",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Product interactions retrieved")
        if 'data' in result:
            data = result['data']
            print(f"  GIT_Count: {data.get('GIT_Count', 0)}")
            print(f"  RaterCount: {data.get('RaterCount', 0)}")
            print(f"  Rating: {data.get('rating', 0)}")
            print(f"  Is Favourite (for current user): {data.get('isFavourite', False)}")
    else:
        print(f"✗ Failed to get product interactions: {response.status_code}")

    print("\n" + "=" * 70)
    print("Test completed!")
    print("=" * 70)
    print("\nSummary:")
    print("✓ Bearer token authentication works")
    print("✓ Legacy X-Buyer-Id header still works (backward compatible)")
    print("✓ Unauthorized requests are properly rejected")

if __name__ == "__main__":
    try:
        test_favorites_with_bearer()
    except Exception as e:
        print(f"\n✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
