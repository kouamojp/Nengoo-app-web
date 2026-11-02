"""
Règles de saisie communes : villes, numéros WhatsApp, fiches produit.
"""
import re
from typing import Optional

from category_tree import normalize_name

# Villes proposées dans les formulaires. Une ville absente de la liste est
# acceptée telle quelle (espaces superflus retirés) : la liste sert à écrire
# toujours de la même façon les villes connues.
CITIES = [
    "Douala", "Yaoundé", "Bafoussam", "Bamenda", "Garoua", "Maroua", "Ngaoundéré",
    "Bertoua", "Buea", "Limbé", "Kribi", "Ebolowa", "Kumba", "Dschang", "Nkongsamba",
    "Edéa", "Foumban", "Mbouda", "Bafang", "Bangangté", "Loum", "Mbalmayo", "Sangmélima",
    "Kousséri", "Tiko", "Mbanga", "Obala", "Bafia", "Batouri", "Meiganga",
]
_CITY_BY_KEY = {normalize_name(c): c for c in CITIES}

MIN_DESCRIPTION_LENGTH = 20


def normalize_city(city: Optional[str]) -> Optional[str]:
    """« DOUALA », « douala  », « Yaounde » → forme de la liste ; sinon le
    texte saisi, espaces superflus retirés."""
    if city is None:
        return None
    cleaned = " ".join(city.split())
    return _CITY_BY_KEY.get(normalize_name(cleaned), cleaned)


def whatsapp_digits(raw: Optional[str]) -> Optional[str]:
    """Numéro international en chiffres (wa.me), ou None s'il est inutilisable.
    Un numéro camerounais à 9 chiffres (6… ou 2…) reçoit l'indicatif 237."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 9 and digits[0] in "62":
        digits = "237" + digits
    if not 8 <= len(digits) <= 15:
        return None
    if digits.startswith("237") and len(digits) != 12:
        return None
    # Une adresse e-mail ou un texte ne contient pas un numéro par hasard
    if re.search(r"[A-Za-z@]", raw or ""):
        return None
    return digits


def product_issues(price=None, images=None, description=None, check=("price", "images", "description")):
    """Problèmes bloquants d'une fiche produit, en clair."""
    issues = []
    if "price" in check and not (price and price > 0):
        issues.append("Le prix doit être supérieur à 0.")
    if "images" in check and not [i for i in (images or []) if i]:
        issues.append("Ajoutez au moins une photo.")
    if "description" in check and len((description or "").strip()) < MIN_DESCRIPTION_LENGTH:
        issues.append(f"La description doit faire au moins {MIN_DESCRIPTION_LENGTH} caractères.")
    return issues
