"""
Arborescence cible des catégories (phase 2 du cahier des charges) et règles
de suggestion pour reclasser les produits.

Chaque nœud : nom FR, nom EN, et « keep » = nom actuel d'une catégorie à
conserver (son identifiant est gardé, les produits et les liens suivent).
Sans « keep », la catégorie est créée.
"""
import re
import unicodedata
from typing import Optional


def normalize_name(name: Optional[str]) -> str:
    """Comparaison de noms sans accents, majuscules, espaces ni « s » final."""
    s = unicodedata.normalize("NFD", (name or "").lower())
    s = re.sub(r"[̀-ͯ]", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return " ".join(w[:-1] if len(w) > 3 and w.endswith("s") else w for w in s.split())


def node(name, name_en, keep=None, subs=()):
    return {"name": name, "nameEn": name_en, "keep": keep, "subs": list(subs)}


TREE = [
    node("Téléphones et accessoires", "Phones and accessories", "Téléphones et accessoires", [
        node("Smartphones", "Smartphones"),
        node("Tablettes", "Tablets"),
        node("Chargeurs et câbles", "Chargers and cables"),
        node("Écouteurs", "Earphones"),
        node("Batteries externes", "Power banks"),
        node("Coques et accessoires", "Cases and accessories"),
    ]),
    node("Informatique", "Computers", "Informatique et accessoires", [
        node("Ordinateurs", "Computers"),
        node("Imprimantes", "Printers"),
        node("Accessoires informatiques", "Computer accessories"),
    ]),
    node("Électronique", "Electronics", "Electroniques", [
        node("Audio, photo et vidéo", "Audio, photo and video", "Audio, photo et vidéo"),
        node("Petits appareils électroniques", "Small electronics"),
        node("Énergie solaire et électricité", "Solar energy and electrical", "Énergie solaire et équipements électriques"),
    ]),
    node("Mode femme", "Women's fashion", None, [
        node("Vêtements femme", "Women's clothing", "Vetements femmes"),
        node("Lingerie et nuit", "Lingerie and nightwear"),
        node("Chaussures femme", "Women's shoes", "Chaussures femmes"),
        node("Sacs et accessoires femme", "Women's bags and accessories", "Accessoires femmes"),
    ]),
    node("Mode homme", "Men's fashion", None, [
        node("Vêtements homme", "Men's clothing", "Vetements hommes"),
        node("Chaussures homme", "Men's shoes", "Chaussures hommes"),
        node("Accessoires homme", "Men's accessories", "Accessoires hommes"),
    ]),
    node("Mode enfant", "Kids' fashion", None, [
        node("Vêtements enfant", "Kids' clothing", "Vetements enfants"),
        node("Chaussures enfant", "Kids' shoes", "Chaussures enfants"),
    ]),
    node("Beauté et cosmétiques", "Beauty and cosmetics", "Beauté et soins", [
        node("Cheveux et perruques", "Hair and wigs", "Bijoux et accessoires de beauté"),
        node("Soins du corps et du visage", "Body and face care"),
        node("Parfums", "Perfumes"),
        node("Maquillage", "Make-up"),
    ]),
    node("Santé et bien-être", "Health and wellness", None, [
        node("Hygiène", "Hygiene"),
        node("Matériel médical", "Medical equipment"),
    ]),
    node("Maison et décoration", "Home and decor", None, [
        node("Meubles", "Furniture", "Meubles"),
        node("Linge de maison et décoration", "Home textiles and decor", "Textiles et Décorations"),
        node("Cuisine et vaisselle", "Kitchen and tableware", "Maison et cuisine"),
    ]),
    node("Électroménager", "Home appliances", None, [
        node("Petit électroménager", "Small appliances"),
        node("Gros électroménager", "Large appliances"),
    ]),
    node("Alimentation et épicerie", "Food and groceries", "Épicerie et produits vivriers", [
        node("Fruits et légumes", "Fruits and vegetables", "Fruits et légumes"),
        node("Produits transformés et conserves", "Processed and canned food", "Produits transformés et conserves"),
        node("Poissons et produits de la mer", "Fish and seafood", "Poissons et produits de la mer"),
        node("Boissons", "Drinks"),
    ]),
    node("Produits du terroir camerounais", "Cameroonian local produce", "Produits locaux", [
        node("Plantain", "Plantain"),
        node("Manioc", "Cassava"),
        node("Macabo", "Cocoyam"),
        node("Igname", "Yam"),
        node("Maïs", "Maize"),
        node("Arachides", "Groundnuts"),
        node("Huile de palme", "Palm oil"),
        node("Cacao et café", "Cocoa and coffee"),
        node("Miel", "Honey"),
        node("Produits du terroir transformés", "Processed local produce"),
    ]),
    node("Agriculture et élevage", "Farming and livestock", "Produits agricoles et élevage", [
        node("Jardinage et matériel agricole", "Gardening and farm equipment", "Jardinage et matériel agricole"),
        node("Animaux et accessoires", "Animals and pet supplies", "Animaux et accessoires"),
        node("Semences et intrants", "Seeds and inputs"),
    ]),
    node("Construction et bricolage", "Construction and DIY", "Constructions", [
        node("Outillage et bricolage", "Tools and DIY", "Outillage et bricolage"),
        node("Matériaux de construction", "Building materials"),
    ]),
    node("Automobile et pièces détachées", "Cars and spare parts", "Auto, moto et pièces détachées", [
        node("Pièces auto", "Car parts"),
        node("Accessoires auto", "Car accessories"),
    ]),
    node("Motos et transport", "Motorbikes and transport", None, [
        node("Motos", "Motorbikes"),
        node("Pièces moto", "Motorbike parts"),
        node("Vélos", "Bicycles"),
    ]),
    node("Bébé et maternité", "Baby and maternity", "Bébé et puériculture", [
        node("Articles pour enfant", "Kids' items", "Articles pour enfant"),
        node("Puériculture", "Childcare"),
    ]),
    node("Sport et loisirs", "Sports and leisure", None, [
        node("Sports et fitness", "Sports and fitness", "Sports et fitness"),
        node("Camping et plein air", "Camping and outdoors", "Camping et plein air"),
        node("Jouets et jeux", "Toys and games", "Jouets et jeux"),
        node("Bagagerie et voyage", "Luggage and travel", "Bagagerie et voyage"),
    ]),
    node("Livres, école et bureau", "Books, school and office", None, [
        node("Livres et supports éducatifs", "Books and learning materials", "Livres et supports éducatifs"),
        node("Fournitures scolaires et papeterie", "School supplies and stationery", "Fournitures scolaires et papeterie"),
        node("Fournitures de bureau", "Office supplies", "Fournitures de bureau"),
    ]),
    node("Artisanat et Made in Cameroon", "Crafts and Made in Cameroon", "Artisanat et art", [
        node("Pagnes et tissus traditionnels", "Wax prints and traditional fabrics", "Pagnes et tissus traditionnels"),
        node("Tenues traditionnelles et de cérémonie", "Traditional and ceremonial wear", "Vêtements traditionnels et tenues de cérémonie"),
        node("Objets d'art et décoration artisanale", "Art and handmade decor"),
    ]),
    node("Équipements professionnels", "Professional equipment", "Équipements professionnels", [
        node("Protection et sécurité", "Protection and safety", "Équipements de protection et sécurité"),
        node("Matériel pour commerces", "Shop equipment"),
    ]),
    # Catégorie de repli : vidée au fil des reclassements, masquée quand vide
    node("Autres", "Other", "Autres"),
]


# Mots du nom ou de la description d'un produit → sous-catégorie suggérée.
# Les règles sont lues dans l'ordre : la première qui correspond l'emporte.
# Le genre (femme, homme, enfant) est appliqué ensuite aux vêtements et chaussures.
_SHOES = r"chaussure|babouche|barbouche|tenn?is|basquette|campus|ballerine|tennis|basket|sandale|sabot?|escarpin|jordan|samba|new balance|loafer|mocassin|compens[eé]|\btalon|mule|claquette|botte"
_CLOTHES = (r"robe|rode|robette|corse[tr]|juste ?corps|veston|jupe|ensemble|tailleur|combinaison|combishort|chemisier|chemise|crop|bustier|blouse|body|"
            r"legging|liguin|pull|blouson|perfecto|culotte|pantalon|jean|djean|gang|haut|t-?shirt|tee shirt|polo|veste|"
            r"blazer|tricot|jogging|surv[eê]t|v[eê]tement|tenue|gilet|short|salopette|chemisette")

RULES = [
    (r"soutien|string|cale[cç]on|calesson|nuisette|lingerie|gaine|pyjama", "Lingerie et nuit"),
    (r"pagne|wax|tissu", "Pagnes et tissus traditionnels"),
    (r"m[eè]che|perruque|lace|closure|curly|pixie|bob full|straight|loose", "Cheveux et perruques"),
    (r"parfum|eau de toilette", "Parfums"),
    (r"d[eé]odorant|gel de douche|lait de toilette|cr[eè]me|lotion|savon|lait corporel", "Soins du corps et du visage"),
    (r"brosse [aà] dent|dentifrice", "Hygiène"),
    (r"chargeur|c[aâ]ble usb|c[aâ]ble type", "Chargeurs et câbles"),
    (r"[eé]couteur|airpod|earbud", "Écouteurs"),
    (r"power ?bank|batterie externe", "Batteries externes"),
    (r"tablette", "Tablettes"),
    (r"t[eé]l[eé]phone|smartphone|iphone|samsung|tecno|infinix|itel|pochette andro|coque|support t[eé]l", "Coques et accessoires"),
    (r"casque|enceinte|haut-?parleur|ring ?li|bluetooth|appareil photo|cam[eé]ra", "Audio, photo et vidéo"),
    (r"ventilateur|lampe led|led light", "Petits appareils électroniques"),
    (r"air ?fryer|friteuse|gaufre|moulinex|extracteur|blender|mixeur|batteu|fer [aà] repasser|d[eé]froisseur|"
     r"balance alimentaire|machine [aà]|bouilloire|cuiseur|r[eé]chaud", "Petit électroménager"),
    (r"r[eé]frig[eé]rateur|frigo|cong[eé]lateur|cuisini[eè]re|machine [aà] laver", "Gros électroménager"),
    (r"assiette|vaisselle|ustensile|moule|marmite|casserole|couteau|bol\b|[eé]gouttoir|gourde|verre", "Cuisine et vaisselle"),
    (r"drap|taie|couette|couverture|linge de lit|housse|rideau|tableau d[eé]cor|coussin", "Linge de maison et décoration"),
    (r"canap[eé]|chaise|table|lit\b|armoire|meuble", "Meubles"),
    (r"jouet|peluche|jeu de soci", "Jouets et jeux"),
    (r"b[eé]b[eé]|baby|couffin|biberon|poussette", "Puériculture"),
    (r"chapeau|casquette|bonnet|foulard|turban|sac [aà] main|sac bandouli|pochette|portefeuille|ceinture|lunette|montre|bijou|boucle|cha[iî]ne|collier|bracelet", "Sacs et accessoires femme"),
    (r"tondeuse|rasoir", "Accessoires homme"),
    (_SHOES, "Chaussures femme"),
    (_CLOTHES, "Vêtements femme"),
]

_GENDER = {
    "Chaussures femme": {"homme": "Chaussures homme", "enfant": "Chaussures enfant"},
    "Vêtements femme": {"homme": "Vêtements homme", "enfant": "Vêtements enfant"},
}
_MEN = re.compile(r"\bhomme|\bmonsieur|\bgar[cç]on", re.I)
_KIDS = re.compile(r"\benfant|\bkid|\bfille\b|\bb[eé]b[eé]", re.I)


def suggest_category_name(name: str, description: str = "") -> Optional[str]:
    """Nom de la sous-catégorie suggérée pour un produit, ou None."""
    text = f"{name or ''} {description or ''}".lower()
    title = (name or "").lower()
    for pattern, target in RULES:
        # Le nom passe avant la description : « Robe » décrite « avec ceinture »
        if re.search(pattern, title):
            break
    else:
        target = next((t for p, t in RULES if re.search(p, text)), None)
    if target in _GENDER:
        if _KIDS.search(text):
            target = _GENDER[target]["enfant"]
        elif _MEN.search(text):
            target = _GENDER[target]["homme"]
    return target


def tree_names():
    """Tous les noms de l'arborescence (catégories et sous-catégories)."""
    for top in TREE:
        yield top["name"]
        for sub in top["subs"]:
            yield sub["name"]
