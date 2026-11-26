"""Contenu des pages publiques sans JavaScript (fiche produit, boutique, catégorie).

Le site est une application React : sans exécuter son script, un robot ne voit
qu'une page vide. frontend/public/page.php demande ici, pour chaque adresse,
le titre, la description, l'adresse canonique, les données structurées et un
contenu HTML simple (titre, prix, description, liens), qu'il place dans
index.html. Tout le monde reçoit la même page ; React la remplace ensuite.

Les fonctions de ce module ne lisent pas la base : server.py leur passe les
documents, ce qui les rend faciles à tester.
"""
import html
import re
from typing import Iterable, List, Optional

SITE_NAME = "Nengoo"
MAX_LINKS = 60


def esc(value) -> str:
    return html.escape(str(value or ""), quote=True)


def plain_text(value: Optional[str]) -> str:
    """Description en texte simple (elle peut contenir du HTML mis en forme)."""
    text = html.unescape(re.sub(r"<[^>]+>", " ", value or ""))
    return " ".join(text.split())


def shorten(text: str, limit: int = 160) -> str:
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0]
    return cut.rstrip(" ,.;:–-") + "…"


def format_price(amount) -> str:
    try:
        value = int(round(float(amount or 0)))
    except (TypeError, ValueError):
        value = 0
    return f"{value:,}".replace(",", " ") + " FCFA"


def product_price(product: dict) -> float:
    promo = product.get("promoPrice")
    price = product.get("price") or 0
    return promo if promo and 0 < promo < price else price


def product_image(product: dict) -> Optional[str]:
    for key in ("previews", "images"):
        for url in product.get(key) or []:
            if isinstance(url, str) and url.strip().startswith("http"):
                return url.strip()
    return None


def breadcrumb_schema(items: List[tuple]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
            for i, (name, url) in enumerate(items)
        ],
    }


def breadcrumb_html(items: List[tuple]) -> str:
    links = " › ".join(
        f'<a href="{esc(url)}">{esc(name)}</a>' if i < len(items) - 1 else f"<span>{esc(name)}</span>"
        for i, (name, url) in enumerate(items)
    )
    return f'<nav aria-label="Fil d’Ariane" class="text-sm text-gray-600 mb-4">{links}</nav>'


def product_links_html(products: Iterable[dict], site_url: str, title: str) -> str:
    items = [
        f'<li><a href="{esc(site_url)}/product/{esc(p.get("slug") or p.get("id"))}">{esc(p.get("name"))}</a>'
        f" — {esc(format_price(product_price(p)))}</li>"
        for p in list(products)[:MAX_LINKS]
    ]
    if not items:
        return ""
    return f'<h2 class="text-xl font-bold mt-8 mb-3">{esc(title)}</h2><ul class="space-y-1">{"".join(items)}</ul>'


def page(title, description, canonical, body, json_ld, image=None, og_type="website", robots=None) -> dict:
    return {
        "status": 200,
        "title": title,
        "description": description,
        "canonical": canonical,
        "image": image,
        "ogType": og_type,
        "robots": robots,
        "jsonLd": json_ld,
        "body": f'<main class="container mx-auto px-4 py-8 text-left">{body}</main>',
    }


def redirect(location: str) -> dict:
    return {"status": 301, "location": location}


NOT_FOUND = {"status": 404}


def product_page(product: dict, seller: Optional[dict], crumbs: List[tuple], site_url: str,
                 image: Optional[str] = None) -> dict:
    """crumbs : catégories du produit (parent puis sous-catégorie), en (nom, url)."""
    name = (product.get("name") or "Produit").strip()
    slug = product.get("slug") or product.get("id")
    url = f"{site_url}/product/{slug}"
    description_text = plain_text(product.get("description"))
    price = product_price(product)
    shop = (seller or {}).get("businessName") or product.get("sellerName") or ""
    # Lien vers la boutique seulement si elle a une page (vendeur validé)
    shop_url = (f"{site_url}/seller/{seller.get('slug') or seller.get('id')}"
                if seller and seller.get("status") == "approved" else None)
    city = (seller or {}).get("city")
    image = image or product_image(product)
    # Comme isAvailable (frontend/src/lib/productRules.js)
    in_stock = (product.get("kind") == "service"
                or (product.get("kind") == "meal" and product.get("mealOrder") == "whatsapp")
                or (product.get("stock") or 0) > 0)

    meta = shorten(description_text or f"{name} à {format_price(price)} sur Nengoo"
                   + (f", vendu par {shop}" if shop else "") + ". Livraison au Cameroun.")
    trail = [("Accueil", f"{site_url}/"), *crumbs, (name, url)]

    body = [breadcrumb_html(trail), f'<h1 class="text-3xl font-bold mb-3">{esc(name)}</h1>']
    if image:
        body.append(f'<img src="{esc(image)}" alt="{esc(name)}" width="600" height="600" '
                    f'style="max-width:100%;height:auto" loading="eager">')
    body.append(f'<p class="text-2xl font-bold text-purple-800 mt-3">{esc(format_price(price))}</p>')
    if shop:
        place = f" · {esc(city)}" if city else ""
        who = f'<a href="{esc(shop_url)}">{esc(shop)}</a>' if shop_url else esc(shop)
        body.append(f'<p class="mt-2">Vendu par {who}{place}</p>')
    if description_text:
        body.append(f'<h2 class="text-xl font-bold mt-6 mb-2">Description</h2><p>{esc(description_text)}</p>')

    offer = {
        "@type": "Offer",
        "url": url,
        "priceCurrency": product.get("currency") or "XAF",
        "price": price,
        "availability": "https://schema.org/InStock" if in_stock else "https://schema.org/OutOfStock",
    }
    if shop:
        offer["seller"] = {"@type": "Organization", "name": shop}
    schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "url": url,
        "description": shorten(description_text, 500) if description_text else meta,
        "offers": offer,
    }
    if image:
        schema["image"] = [image]
    if product.get("brand"):
        schema["brand"] = {"@type": "Brand", "name": product["brand"]}
    return page(f"{name} — {format_price(price)} | Nengoo", meta, url, "".join(body),
                [schema, breadcrumb_schema(trail)], image=image, og_type="product")


def seller_page(seller: dict, products: List[dict], site_url: str) -> dict:
    name = (seller.get("businessName") or "Boutique").strip()
    url = f"{site_url}/seller/{seller.get('slug') or seller.get('id')}"
    description_text = plain_text(seller.get("description"))
    place = ", ".join(v for v in (seller.get("city"), seller.get("region")) if v)
    count = len(products)
    meta = shorten(description_text or (
        f"{name}{' à ' + seller['city'] if seller.get('city') else ''} : "
        f"{count} produit{'s' if count > 1 else ''} à commander sur Nengoo, livraison au Cameroun."))
    trail = [("Accueil", f"{site_url}/"), (name, url)]

    body = [breadcrumb_html(trail), f'<h1 class="text-3xl font-bold mb-2">{esc(name)}</h1>']
    if place:
        body.append(f'<p class="text-gray-700">{esc(place)}</p>')
    if description_text:
        body.append(f'<p class="mt-3">{esc(description_text)}</p>')
    body.append(product_links_html(products, site_url, f"Produits de {name} ({count})"))

    schema = {"@context": "https://schema.org", "@type": "Store", "name": name, "url": url}
    if seller.get("logoUrl"):
        schema["image"] = seller["logoUrl"]
    if description_text:
        schema["description"] = shorten(description_text, 500)
    if seller.get("city"):
        schema["address"] = {"@type": "PostalAddress", "addressLocality": seller["city"],
                             "addressRegion": seller.get("region"), "addressCountry": "CM"}
    # Boutique sans produit en ligne : page sans intérêt pour la recherche
    robots = None if count else "noindex,follow"
    return page(f"{name} - Boutique sur Nengoo", meta, url, "".join(body),
                [schema, breadcrumb_schema(trail)], image=seller.get("logoUrl"), robots=robots)


def category_page(category: dict, parent: Optional[dict], children: List[dict], products: List[dict],
                  site_url: str, slug_of) -> dict:
    """slug_of(nom) → slug de l'adresse /catalog/<slug> (generate_slug)."""
    name = (category.get("name") or "Catégorie").strip()
    url = f"{site_url}/catalog/{slug_of(name)}"
    count = len(products)
    # Titre et description propres à chaque niveau : une sous-catégorie nomme
    # sa catégorie principale, pour ne pas concurrencer la page de celle-ci
    if parent:
        title = f"{name} ({parent['name']}) — Catalogue Nengoo"
        meta = (f"{name} : {count} produit{'s' if count > 1 else ''} de la catégorie {parent['name']} "
                f"à commander sur Nengoo, livraison au Cameroun.")
    else:
        subs = ", ".join(c["name"] for c in children[:4])
        title = f"{name} — Catalogue Nengoo"
        meta = (f"{name} au Cameroun : {count} produit{'s' if count > 1 else ''} sur Nengoo"
                + (f" ({subs}…)" if subs else "") + ".")
    trail = [("Accueil", f"{site_url}/"), ("Catalogue", f"{site_url}/catalog")]
    if parent:
        trail.append((parent["name"], f"{site_url}/catalog/{slug_of(parent['name'])}"))
    trail.append((name, url))

    body = [breadcrumb_html(trail), f'<h1 class="text-3xl font-bold mb-2">{esc(name)}</h1>',
            f'<p class="text-gray-700">{esc(meta)}</p>']
    if children:
        links = "".join(f'<li><a href="{esc(site_url)}/catalog/{esc(slug_of(c["name"]))}">{esc(c["name"])}</a></li>'
                        for c in children)
        body.append(f'<h2 class="text-xl font-bold mt-6 mb-2">Sous-catégories</h2><ul class="space-y-1">{links}</ul>')
    body.append(product_links_html(products, site_url, "Produits"))

    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": name,
        "url": url,
        "description": meta,
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": count,
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1,
                 "url": f"{site_url}/product/{p.get('slug') or p.get('id')}", "name": p.get("name")}
                for i, p in enumerate(products[:MAX_LINKS])
            ],
        },
    }
    robots = None if count else "noindex,follow"
    return page(title, shorten(meta), url, "".join(body), [schema, breadcrumb_schema(trail)], robots=robots)
