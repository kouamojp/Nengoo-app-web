# Sécurité des Mots de Passe - SHA-256 + bcrypt (OBSOLÈTE)

⚠️ **ATTENTION : Ce document est obsolète**
Voir `SHA256_BCRYPT_SECURITY.md` pour la documentation à jour.

## Archive : Ancienne Implémentation (Limite de 72 bytes)

### Pourquoi cette limite ?

**bcrypt** a une limite technique intrinsèque de **72 bytes** pour les mots de passe. Cette limite est due à la façon dont bcrypt traite les données :

1. bcrypt utilise l'algorithme Blowfish qui a une limite de clé de 72 bytes
2. Tout caractère au-delà de 72 bytes est **silencieusement ignoré**
3. Cela peut créer des problèmes de sécurité si non géré correctement

### Exemple du Problème

Sans validation explicite :
```python
# Ces deux mots de passe seraient considérés identiques par bcrypt !
password1 = "a" * 72 + "xyz"  # 75 caractères
password2 = "a" * 72 + "abc"  # 75 caractères différents

# bcrypt n'utilisera que les 72 premiers bytes
# "xyz" et "abc" sont ignorés !
```

## Solution Implémentée

### Backend (server.py)

Fonction de validation ajoutée :
```python
def validate_password(password: str) -> None:
    """
    Validate password meets security requirements.
    bcrypt has a maximum password length of 72 bytes.
    """
    if len(password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=400,
            detail="Le mot de passe ne peut pas dépasser 72 caractères (bytes)"
        )
    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Le mot de passe doit contenir au moins 6 caractères"
        )
```

Cette validation est automatiquement appelée dans `hash_password()`, donc tous les points d'entrée sont couverts :
- Inscription acheteur (`/auth/register/buyer`)
- Inscription vendeur (`/auth/register/seller`)
- Création admin (`/admin/create`)
- Création vendeur par admin (`/admin/sellers`)

### Frontend (BuyerSignup.js, SellerSignup.js)

Validation côté client pour meilleure UX :
```javascript
const validatePassword = () => {
  if (!isLogin) {
    if (formData.password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    // bcrypt limit: 72 bytes
    if (new Blob([formData.password]).size > 72) {
      setPasswordError('Le mot de passe ne peut pas dépasser 72 caractères (bytes)');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return false;
    }
  }
  setPasswordError('');
  return true;
};
```

## Caractères UTF-8 et Bytes

### Important à Comprendre

La limite est en **bytes**, pas en caractères :

- **1 caractère ASCII** = 1 byte (ex: "a", "1", "!")
- **1 caractère accentué** = 2 bytes (ex: "é", "à")
- **1 emoji** = 4 bytes (ex: "🔒", "🎉")

### Exemples

```
✅ Valide : "MonMotDePasse123!"              (17 caractères = 17 bytes)
✅ Valide : "MotDePasseSécurisé2025!"        (24 caractères = 26 bytes)
✅ Valide : "a" * 72                         (72 caractères = 72 bytes)

❌ Invalide : "a" * 73                       (73 caractères = 73 bytes)
❌ Invalide : "é" * 37                       (37 caractères = 74 bytes)
❌ Invalide : "🔒" * 19                       (19 caractères = 76 bytes)
```

## Recommandations de Sécurité

### Pour les Utilisateurs

1. **Longueur recommandée** : 12-60 caractères
2. **Complexité** :
   - Mélangez majuscules, minuscules, chiffres, symboles
   - Évitez les mots du dictionnaire
   - N'utilisez pas d'informations personnelles

3. **Exemples de bons mots de passe** :
   ```
   ✅ "MonC@meroun2025!"
   ✅ "J'aime#Nengoo$2025"
   ✅ "D0ual@-Y@0undé!"
   ```

### Pour les Développeurs

1. **Ne jamais** augmenter la limite au-delà de 72 bytes
2. **Toujours** valider côté serveur (ne pas faire confiance au client)
3. **Considérer** d'utiliser bcrypt avec des paramètres adaptés :
   - `rounds=12` (par défaut dans notre config)
   - Ajuster selon les besoins de performance

## Tests de Validation

### Test Backend

```python
# test_password_validation.py
import pytest
from fastapi import HTTPException

def test_password_too_long():
    password = "a" * 73
    with pytest.raises(HTTPException) as exc_info:
        validate_password(password)
    assert "72 caractères" in str(exc_info.value.detail)

def test_password_too_short():
    password = "abc"
    with pytest.raises(HTTPException) as exc_info:
        validate_password(password)
    assert "6 caractères" in str(exc_info.value.detail)

def test_password_valid():
    password = "ValidPassword123!"
    validate_password(password)  # Ne devrait pas lever d'exception
```

### Test Frontend

```javascript
// Test manuel
const testCases = [
  { pwd: "abc", valid: false, reason: "Trop court" },
  { pwd: "abcdef", valid: true, reason: "Longueur valide" },
  { pwd: "a".repeat(72), valid: true, reason: "72 caractères OK" },
  { pwd: "a".repeat(73), valid: false, reason: "Dépasse 72 bytes" },
  { pwd: "🔒".repeat(19), valid: false, reason: "76 bytes (19*4)" }
];
```

## Alternatives à bcrypt (Futures Considérations)

Si la limite de 72 bytes devient problématique, considérer :

1. **Argon2** - Pas de limite de 72 bytes, plus moderne
2. **scrypt** - Pas de limite de 72 bytes
3. **PBKDF2** - Flexible mais moins sécurisé que bcrypt/Argon2

Pour notre cas d'usage actuel, **bcrypt est suffisant** car :
- 72 bytes permettent des mots de passe très forts
- La limite est bien documentée et gérée
- bcrypt est éprouvé et largement utilisé

## Références

- [bcrypt specification](https://en.wikipedia.org/wiki/Bcrypt)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Python bcrypt documentation](https://github.com/pyca/bcrypt/)

## Historique des Modifications

- **2025-11-19** : Implémentation de la validation 72 bytes
  - Ajout de `validate_password()` dans server.py
  - Mise à jour des composants frontend
  - Documentation créée

---

**Note** : Cette limite est une caractéristique de sécurité, pas un bug. Elle garantit que tous les caractères du mot de passe sont effectivement utilisés par l'algorithme de hachage.
