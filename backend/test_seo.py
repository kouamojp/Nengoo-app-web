#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de test pour vérifier les fonctionnalités SEO
"""
import sys
import os
import asyncio
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from xml.etree import ElementTree as ET

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def test_robots_txt(base_url):
    """Teste si robots.txt est accessible"""
    print("\n" + "="*80)
    print("TEST ROBOTS.TXT")
    print("="*80)

    try:
        url = f"{base_url}/robots.txt"
        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            print(f"✅ robots.txt accessible à {url}")
            print(f"\nContenu (premières lignes):")
            lines = response.text.split('\n')[:10]
            for line in lines:
                print(f"  {line}")

            # Vérifier que le sitemap est mentionné
            if 'Sitemap:' in response.text:
                print("\n✅ Sitemap référencé dans robots.txt")
            else:
                print("\n⚠️  Sitemap NON référencé dans robots.txt")

            return True
        else:
            print(f"❌ robots.txt non accessible (HTTP {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_sitemap_xml(base_url):
    """Teste si sitemap.xml est accessible et valide"""
    print("\n" + "="*80)
    print("TEST SITEMAP.XML")
    print("="*80)

    try:
        url = f"{base_url}/sitemap.xml"
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            print(f"✅ sitemap.xml accessible à {url}")

            # Parser le XML
            try:
                root = ET.fromstring(response.content)

                # Compter les URLs
                namespace = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
                urls = root.findall('sm:url', namespace)

                print(f"\n✅ Sitemap XML valide")
                print(f"✅ Total URLs: {len(urls)}")

                # Afficher quelques exemples
                print(f"\nExemples d'URLs (premières 5):")
                for i, url_elem in enumerate(urls[:5]):
                    loc = url_elem.find('sm:loc', namespace)
                    priority = url_elem.find('sm:priority', namespace)
                    changefreq = url_elem.find('sm:changefreq', namespace)

                    if loc is not None:
                        print(f"\n  {i+1}. {loc.text}")
                        if priority is not None:
                            print(f"     Priorité: {priority.text}")
                        if changefreq is not None:
                            print(f"     Fréquence: {changefreq.text}")

                # Analyser les types d'URLs
                product_urls = [u for u in urls if '/product/' in u.find('sm:loc', namespace).text]
                seller_urls = [u for u in urls if '/seller/' in u.find('sm:loc', namespace).text]
                category_urls = [u for u in urls if '/catalog/' in u.find('sm:loc', namespace).text]

                print(f"\n📊 Statistiques:")
                print(f"  - URLs de produits: {len(product_urls)}")
                print(f"  - URLs de vendeurs: {len(seller_urls)}")
                print(f"  - URLs de catégories: {len(category_urls)}")
                print(f"  - Autres pages: {len(urls) - len(product_urls) - len(seller_urls) - len(category_urls)}")

                return True

            except ET.ParseError as e:
                print(f"❌ Erreur de parsing XML: {e}")
                return False

        else:
            print(f"❌ sitemap.xml non accessible (HTTP {response.status_code})")
            return False

    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

async def test_database_content():
    """Vérifie le contenu de la base de données pour le SEO"""
    print("\n" + "="*80)
    print("TEST CONTENU DATABASE")
    print("="*80)

    try:
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_uri)
        db = client.nengoo_marketplace

        # Compter les produits approuvés
        approved_products = await db.products.count_documents({"status": "approved"})
        total_products = await db.products.count_documents({})

        # Compter les vendeurs approuvés
        approved_sellers = await db.sellers.count_documents({"status": "approved"})
        total_sellers = await db.sellers.count_documents({})

        # Compter les catégories
        categories = await db.categories.count_documents({})

        print(f"\n✅ Connexion à la database réussie")
        print(f"\n📊 Contenu:")
        print(f"  - Produits approuvés: {approved_products}/{total_products}")
        print(f"  - Vendeurs approuvés: {approved_sellers}/{total_sellers}")
        print(f"  - Catégories: {categories}")

        # Vérifier les produits sans slug
        products_without_slug = await db.products.count_documents({
            "status": "approved",
            "$or": [
                {"slug": {"$exists": False}},
                {"slug": None},
                {"slug": ""}
            ]
        })

        if products_without_slug > 0:
            print(f"\n⚠️  {products_without_slug} produits sans slug (URLs non SEO-friendly)")
        else:
            print(f"\n✅ Tous les produits ont un slug")

        # Vérifier les images manquantes
        products_without_images = await db.products.count_documents({
            "status": "approved",
            "$or": [
                {"images": {"$exists": False}},
                {"images": []},
                {"images": None}
            ]
        })

        if products_without_images > 0:
            print(f"⚠️  {products_without_images} produits sans images")
        else:
            print(f"✅ Tous les produits ont des images")

        client.close()
        return True

    except Exception as e:
        print(f"❌ Erreur database: {e}")
        return False

def test_meta_tags(base_url):
    """Teste les meta tags des pages principales"""
    print("\n" + "="*80)
    print("TEST META TAGS")
    print("="*80)

    pages_to_test = [
        f"{base_url}/",
        f"{base_url}/catalog",
        f"{base_url}/about"
    ]

    for url in pages_to_test:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                html = response.text

                # Vérifier les meta tags essentiels
                has_title = '<title>' in html
                has_description = 'name="description"' in html
                has_og_image = 'property="og:image"' in html
                has_canonical = 'rel="canonical"' in html

                print(f"\n{url}:")
                print(f"  {'✅' if has_title else '❌'} Title tag")
                print(f"  {'✅' if has_description else '❌'} Meta description")
                print(f"  {'✅' if has_og_image else '❌'} OG Image")
                print(f"  {'✅' if has_canonical else '❌'} Canonical URL")
            else:
                print(f"\n{url}: ❌ Non accessible (HTTP {response.status_code})")

        except Exception as e:
            print(f"\n{url}: ❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("\n" + "="*80)
    print("NENGOO SEO TEST SUITE")
    print("="*80)

    # Déterminer l'URL de base
    if len(sys.argv) > 1:
        base_url = sys.argv[1].rstrip('/')
    else:
        base_url = os.getenv('BASE_URL', 'http://localhost:8001')

    print(f"\nBase URL: {base_url}")

    # Tests synchrones
    results = []
    results.append(("robots.txt", test_robots_txt(base_url)))
    results.append(("sitemap.xml", test_sitemap_xml(base_url)))
    results.append(("meta tags", test_meta_tags(base_url)))

    # Tests asynchrones
    db_result = asyncio.run(test_database_content())
    results.append(("database", db_result))

    # Résumé
    print("\n" + "="*80)
    print("RÉSUMÉ")
    print("="*80)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests réussis")
    print("="*80)

    if passed == total:
        print("\n🎉 Tous les tests SEO sont passés!")
    else:
        print(f"\n⚠️  {total - passed} test(s) échoué(s). Voir les détails ci-dessus.")

    print("\n📚 Prochaines étapes:")
    print("1. Redémarrer le serveur backend si nécessaire")
    print("2. Soumettre le sitemap à Google Search Console")
    print("3. Implémenter les recommandations du SEO_GUIDE.md")
    print("4. Tester avec Google PageSpeed Insights")
    print("\n" + "="*80)

if __name__ == "__main__":
    main()
