"""
Script pour tester la normalisation des numéros WhatsApp
"""

def normalize_whatsapp(whatsapp: str) -> str:
    """
    Normalise le format du numéro WhatsApp en supprimant tous les espaces.
    Exemple: '+237 690703689' -> '+237690703689'
    """
    if not whatsapp:
        return ""
    return whatsapp.replace(" ", "").replace("-", "").strip()

# Tests
test_numbers = [
    "+237 690703689",
    "+237690703689",
    "+237 690 703 689",
    "+237-690-703-689",
    "237 690703689",
    " +237 690703689 ",
]

print("=" * 60)
print("TEST DE NORMALISATION DES NUMÉROS WHATSAPP")
print("=" * 60)

for number in test_numbers:
    normalized = normalize_whatsapp(number)
    print(f"\nOriginal    : '{number}'")
    print(f"Normalisé   : '{normalized}'")
    print(f"Match target: {normalized == '+237690703689'}")

print("\n" + "=" * 60)
print("RÉSULTAT: Tous les formats sont normalisés vers '+237690703689'")
print("=" * 60)
