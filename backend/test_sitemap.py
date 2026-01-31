"""
Test script to verify sitemap generation and check URLs
"""
import requests
from xml.etree import ElementTree as ET
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def test_sitemap():
    """Test sitemap.xml endpoint"""
    print("=" * 70)
    print("Testing Sitemap Generation")
    print("=" * 70)

    # Test with local server
    url = "http://localhost:8001/sitemap.xml"
    print(f"\n1. Fetching sitemap from: {url}")

    try:
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            print(f"✓ Sitemap fetched successfully (Status: {response.status_code})")

            # Parse XML
            try:
                root = ET.fromstring(response.content)
                namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

                urls = root.findall('.//ns:url', namespace)
                print(f"\n2. Total URLs in sitemap: {len(urls)}")

                # Check URLs for incorrect domains
                print("\n3. Checking for incorrect domains...")
                incorrect_domains = []
                correct_count = 0
                expected_domain = "nengoo.com"

                for url_elem in urls:
                    loc = url_elem.find('ns:loc', namespace)
                    if loc is not None:
                        url_text = loc.text
                        if expected_domain not in url_text:
                            incorrect_domains.append(url_text)
                        else:
                            correct_count += 1

                print(f"   ✓ Correct URLs ({expected_domain}): {correct_count}")

                if incorrect_domains:
                    print(f"\n   ✗ Found {len(incorrect_domains)} incorrect URLs:")
                    for url in incorrect_domains[:5]:  # Show first 5
                        print(f"      - {url}")
                    if len(incorrect_domains) > 5:
                        print(f"      ... and {len(incorrect_domains) - 5} more")
                else:
                    print(f"   ✓ All URLs use the correct domain!")

                # Show sample URLs
                print("\n4. Sample URLs from sitemap:")
                for i, url_elem in enumerate(urls[:5]):
                    loc = url_elem.find('ns:loc', namespace)
                    priority = url_elem.find('ns:priority', namespace)
                    changefreq = url_elem.find('ns:changefreq', namespace)

                    if loc is not None:
                        print(f"   {i+1}. {loc.text}")
                        if priority is not None:
                            print(f"      Priority: {priority.text}", end="")
                        if changefreq is not None:
                            print(f" | Changefreq: {changefreq.text}")
                        else:
                            print()

                if len(urls) > 5:
                    print(f"   ... and {len(urls) - 5} more URLs")

                # Category breakdown
                print("\n5. URL breakdown by type:")
                counts = {
                    'home': 0,
                    'catalog': 0,
                    'product': 0,
                    'seller': 0,
                    'category': 0,
                    'other': 0
                }

                for url_elem in urls:
                    loc = url_elem.find('ns:loc', namespace)
                    if loc is not None:
                        url_text = loc.text
                        if url_text.endswith('/'):
                            counts['home'] += 1
                        elif '/product/' in url_text:
                            counts['product'] += 1
                        elif '/seller/' in url_text:
                            counts['seller'] += 1
                        elif '/catalog/' in url_text:
                            counts['category'] += 1
                        elif '/catalog' in url_text:
                            counts['catalog'] += 1
                        else:
                            counts['other'] += 1

                for url_type, count in counts.items():
                    if count > 0:
                        print(f"   - {url_type.capitalize()}: {count}")

            except ET.ParseError as e:
                print(f"✗ Failed to parse XML: {e}")
                print(f"\nFirst 500 characters of response:")
                print(response.text[:500])

        else:
            print(f"✗ Failed to fetch sitemap (Status: {response.status_code})")
            print(f"Response: {response.text[:200]}")

    except requests.exceptions.ConnectionError:
        print("✗ Connection failed. Is the server running on http://localhost:8001?")
    except requests.exceptions.Timeout:
        print("✗ Request timed out")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 70)
    print("Test completed!")
    print("=" * 70)

if __name__ == "__main__":
    test_sitemap()
