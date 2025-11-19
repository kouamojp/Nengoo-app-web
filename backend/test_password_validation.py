"""
Test de validation des mots de passe (SHA-256 + bcrypt)
Tests for password validation with SHA-256 preprocessing before bcrypt
"""
import sys
from pathlib import Path

# Add parent directory to path to import server modules
sys.path.insert(0, str(Path(__file__).parent))

try:
    from server import validate_password
    from fastapi import HTTPException
except ImportError as e:
    print(f"❌ Erreur d'import: {e}")
    print("Assurez-vous que le serveur et ses dépendances sont installés")
    sys.exit(1)


def test_password_validation():
    """Test des différents cas de validation de mot de passe"""

    print("\n" + "="*60)
    print("TEST DE VALIDATION DES MOTS DE PASSE (SHA-256 + bcrypt)")
    print("="*60 + "\n")

    test_cases = [
        {
            "name": "Mot de passe trop court (3 caracteres)",
            "password": "abc",
            "should_fail": True,
            "expected_error": "au moins 6"
        },
        {
            "name": "Mot de passe trop court (5 caracteres)",
            "password": "abcde",
            "should_fail": True,
            "expected_error": "au moins 6"
        },
        {
            "name": "Mot de passe valide (6 caracteres)",
            "password": "abcdef",
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe valide complexe",
            "password": "MonMotDePasse123!",
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe valide avec accents",
            "password": "MotDePasseSecurise2025!",
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe 72 caracteres (maintenant OK grace a SHA-256)",
            "password": "a" * 72,
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe 73 caracteres (maintenant OK grace a SHA-256)",
            "password": "a" * 73,
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe 100 caracteres (maintenant OK grace a SHA-256)",
            "password": "a" * 100,
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe 500 caracteres (OK)",
            "password": "SuperLongPassword" * 30,  # ~510 caracteres
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe exactement 1000 caracteres (limite max)",
            "password": "a" * 1000,
            "should_fail": False,
            "expected_error": None
        },
        {
            "name": "Mot de passe 1001 caracteres (depasse la limite)",
            "password": "a" * 1001,
            "should_fail": True,
            "expected_error": "1000"
        },
        {
            "name": "Mot de passe tres long avec UTF-8",
            "password": "MonMotDePasseAvecDesAccents" * 20,
            "should_fail": False,
            "expected_error": None
        },
    ]

    passed = 0
    failed = 0

    for i, test in enumerate(test_cases, 1):
        password = test["password"]
        should_fail = test["should_fail"]
        expected_error = test["expected_error"]

        print(f"\nTest #{i}: {test['name']}")
        print(f"  Mot de passe: '{password[:20]}{'...' if len(password) > 20 else ''}'")
        print(f"  Longueur: {len(password)} caracteres")
        print(f"  Taille: {len(password.encode('utf-8'))} bytes")

        try:
            validate_password(password)

            if should_fail:
                print(f"  [FAIL] ECHEC - Devrait echouer mais a reussi")
                failed += 1
            else:
                print(f"  [PASS] REUSSI - Validation passee comme attendu")
                passed += 1

        except HTTPException as e:
            error_detail = str(e.detail)

            if not should_fail:
                print(f"  [FAIL] ECHEC - Ne devrait pas echouer: {error_detail}")
                failed += 1
            elif expected_error and expected_error in error_detail:
                print(f"  [PASS] REUSSI - Erreur attendue: {error_detail}")
                passed += 1
            elif expected_error and expected_error not in error_detail:
                print(f"  [FAIL] ECHEC - Erreur incorrecte")
                print(f"     Attendu: {expected_error}")
                print(f"     Obtenu: {error_detail}")
                failed += 1
            else:
                print(f"  [PASS] REUSSI - Rejete comme attendu: {error_detail}")
                passed += 1

    # Résumé
    print("\n" + "="*60)
    print("RESUME DES TESTS")
    print("="*60)
    print(f"Total de tests: {len(test_cases)}")
    print(f"[PASS] Reussis: {passed}")
    print(f"[FAIL] Echoues: {failed}")
    print(f"Taux de reussite: {(passed/len(test_cases)*100):.1f}%")
    print("="*60 + "\n")

    if failed > 0:
        print("[WARNING] Certains tests ont echoue. Verifiez la fonction validate_password()")
        return False
    else:
        print("[SUCCESS] Tous les tests ont reussi !")
        return True


def test_byte_size_examples():
    """Affiche des exemples de taille en bytes pour différents types de caractères"""

    print("\n" + "="*60)
    print("EXEMPLES DE TAILLE EN BYTES")
    print("="*60 + "\n")

    examples = [
        ("ASCII simple", "abcdefgh", "1 byte par caractere"),
        ("Chiffres", "12345678", "1 byte par caractere"),
        ("Symboles", "!@#$%^&*", "1 byte par caractere"),
        ("Accents francais", "eeeaaa", "2 bytes par caractere (en UTF-8 reel)"),
        ("Mixte", "Pass123!", "Mix de tailles"),
    ]

    for name, text, note in examples:
        byte_size = len(text.encode('utf-8'))
        char_count = len(text)
        print(f"{name:20} | Texte: '{text}'")
        print(f"{'':20} | {char_count} caracteres = {byte_size} bytes ({note})")
        print()


if __name__ == "__main__":
    print("\n[SECURITE] Test de Validation des Mots de Passe - Limite bcrypt (72 bytes)\n")

    # Afficher les exemples de tailles
    test_byte_size_examples()

    # Exécuter les tests de validation
    success = test_password_validation()

    # Exit code pour CI/CD
    sys.exit(0 if success else 1)
