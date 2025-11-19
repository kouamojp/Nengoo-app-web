# Sécurité des Mots de Passe - SHA-256 + bcrypt

## Architecture de Sécurité

Le système utilise une approche hybride **SHA-256 + bcrypt** pour le hachage des mots de passe, combinant les avantages des deux algorithmes.

## 🔒 Fonctionnement

### Processus de Hachage (hash_password)

```
Mot de passe utilisateur
    ↓
SHA-256 (256 bits = 32 bytes)
    ↓
Base64 encoding (44 caractères)
    ↓
bcrypt (avec salt automatique)
    ↓
Hash final stocké en base de données
```

### Code Implémenté

```python
def hash_password(password: str) -> str:
    # Étape 1: SHA-256 hash (32 bytes fixes)
    sha256_hash = hashlib.sha256(password.encode('utf-8')).digest()

    # Étape 2: Base64 encoding (44 caractères)
    password_hash_b64 = base64.b64encode(sha256_hash).decode('utf-8')

    # Étape 3: bcrypt (slow hash + salt)
    return pwd_context.hash(password_hash_b64)
```

## ✅ Avantages de cette Approche

### 1. Pas de Limite de Longueur

**Avant (bcrypt seul)** :
- ❌ Limite de 72 bytes
- ❌ Caractères au-delà ignorés silencieusement
- ❌ Problèmes avec les caractères UTF-8

**Maintenant (SHA-256 + bcrypt)** :
- ✅ Accepte des mots de passe jusqu'à 1000 caractères
- ✅ Tous les caractères sont pris en compte
- ✅ Support complet UTF-8 (emojis, accents, etc.)

### 2. Sécurité Renforcée

#### SHA-256
- **Compression** : Réduit n'importe quelle longueur à 32 bytes
- **Déterministe** : Même mot de passe = même hash SHA-256
- **Rapide** : Pré-traitement instantané
- **Collision-resistant** : Pratiquement impossible de trouver deux mots de passe avec le même hash

#### bcrypt
- **Slow hashing** : Ralentit les attaques par force brute
- **Salt automatique** : Chaque hash est unique (même pour le même mot de passe)
- **Work factor** : Peut être ajusté pour augmenter la difficulté
- **Éprouvé** : Standard de l'industrie depuis des années

### 3. Protection Contre les Attaques

| Type d'Attaque | Protection |
|----------------|------------|
| Force brute | ✅ bcrypt (slow hashing) |
| Rainbow tables | ✅ bcrypt (salt unique) |
| Collision SHA-256 | ✅ Pratiquement impossible |
| Longueur excessive | ✅ SHA-256 normalise à 32 bytes |
| Timing attacks | ✅ bcrypt résistant |

## 📊 Exemples Pratiques

### Mots de Passe Courts
```python
password = "Pass123!"
# SHA-256: e5e9fa1ba31ecd1ae84f75caaa474f3a663f05f4...
# Base64:  5en6G6Me...
# bcrypt:  $2b$12$... (avec salt)
```

### Mots de Passe Longs
```python
password = "a" * 100
# SHA-256: fonctionne (réduit à 32 bytes)
# Base64:  44 caractères
# bcrypt:  $2b$12$... (identique en taille au précédent)
```

### Caractères Spéciaux et UTF-8
```python
password = "MônMôtDePâssé🔒2025!"
# SHA-256: traite correctement tous les caractères UTF-8
# Base64:  44 caractères
# bcrypt:  $2b$12$...
```

## 🔐 Limites de Validation

```python
# Limite minimum: 6 caractères
MIN_PASSWORD_LENGTH = 6

# Limite maximum: 1000 caractères (pratique, pas technique)
MAX_PASSWORD_LENGTH = 1000
```

### Pourquoi 1000 caractères max ?

1. **Prévention DoS** : Évite les tentatives de surcharge avec des mots de passe gigantesques
2. **Raisonnable** : 1000 caractères est largement suffisant pour n'importe quel usage
3. **Performance** : SHA-256 reste rapide même avec 1000 caractères

## 🧪 Tests de Validation

Tous les scénarios sont testés dans `test_password_validation.py` :

```bash
$ python test_password_validation.py

Total de tests: 12
[PASS] Réussis: 12
[FAIL] Échoués: 0
Taux de réussite: 100.0%
```

Tests couverts :
- ✅ Mots de passe trop courts (< 6 caractères)
- ✅ Mots de passe valides (6-1000 caractères)
- ✅ Mots de passe de 72, 73, 100, 500 caractères (tous OK)
- ✅ Mots de passe exactement 1000 caractères
- ✅ Mots de passe > 1000 caractères (rejetés)
- ✅ Mots de passe avec UTF-8 (accents, caractères spéciaux)

## 🔄 Compatibilité avec les Anciens Mots de Passe

⚠️ **ATTENTION** : Cette nouvelle implémentation **n'est pas compatible** avec les mots de passe hachés précédemment (si bcrypt était utilisé seul).

### Migration Nécessaire

Si vous aviez déjà des utilisateurs avec des mots de passe :

**Option 1 : Réinitialisation**
```python
# Demander à tous les utilisateurs de réinitialiser leur mot de passe
```

**Option 2 : Migration Progressive**
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Essayer d'abord la nouvelle méthode (SHA-256 + bcrypt)
    sha256_hash = hashlib.sha256(plain_password.encode('utf-8')).digest()
    password_hash_b64 = base64.b64encode(sha256_hash).decode('utf-8')

    if pwd_context.verify(password_hash_b64, hashed_password):
        return True

    # Fallback: ancienne méthode (bcrypt seul)
    if pwd_context.verify(plain_password, hashed_password):
        # Re-hasher avec la nouvelle méthode
        # update_user_password(user_id, hash_password(plain_password))
        return True

    return False
```

## 📚 Références et Standards

### OWASP Recommandations

✅ **Conforme OWASP** :
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- Recommande bcrypt avec work factor ≥ 10 (nous utilisons 12)
- Approuve l'utilisation de SHA-256 comme pré-traitement

### Standards de l'Industrie

- **Django** : Utilise PBKDF2 + SHA-256 par défaut
- **Laravel** : Utilise bcrypt
- **Node.js (bcrypt)** : Recommande le pré-hachage pour les mots de passe > 72 bytes

## 🎯 Recommandations Utilisateurs

### Bons Mots de Passe

```
✅ "MonMotDePasse2025!"           (Complexe, mémorisable)
✅ "J'aime#Nengoo$Cameroun"       (Phrase avec symboles)
✅ "Douala-Yaounde!2025"          (Géographique + date)
✅ "🔒Sécurité🔑2025"              (Avec emojis si souhaité)
```

### Mauvais Mots de Passe

```
❌ "123456"                       (Trop commun)
❌ "password"                     (Mot du dictionnaire)
❌ "abcdef"                       (Trop simple, même si 6+ caractères)
❌ Nom + date de naissance        (Facilement devinable)
```

## 💡 Conseils de Sécurité

1. **Longueur minimale** : Au moins 12 caractères recommandés (minimum technique : 6)
2. **Complexité** : Mélanger majuscules, minuscules, chiffres, symboles
3. **Unicité** : Utiliser un mot de passe différent pour chaque service
4. **Gestionnaire** : Encourager l'utilisation de gestionnaires de mots de passe
5. **2FA** : Considérer l'ajout d'une authentification à deux facteurs (future amélioration)

## 🔧 Configuration bcrypt

Dans `server.py` :

```python
# Password hashing with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

Work factor par défaut de bcrypt : **12 rounds**
- Plus sécurisé que 10 (recommandé minimum OWASP)
- Bon équilibre performance/sécurité
- ~300ms pour hasher (ralentit les attaques)

## 📈 Performance

### Benchmark Approximatif

```
SHA-256 (pré-traitement)  : < 1ms
bcrypt (12 rounds)        : ~300ms
-----------------------------------------
Total par mot de passe    : ~300ms
```

**Impact utilisateur** : Négligeable
- Connexion : 300ms supplémentaires
- Inscription : 300ms supplémentaires
- Imperceptible pour l'utilisateur

**Impact attaquant** : Significatif
- 1 tentative = 300ms
- 3.3 tentatives/seconde max
- Force brute très ralentie

## 🚀 Évolutions Futures Possibles

1. **Argon2** : Considérer la migration vers Argon2 (plus moderne que bcrypt)
2. **PBKDF2-SHA512** : Alternative si bcrypt pose problème
3. **Pepper** : Ajouter un secret serveur en plus du salt
4. **Key stretching** : Augmenter le work factor progressivement

## 🎓 Ressources d'Apprentissage

- [bcrypt explained](https://en.wikipedia.org/wiki/Bcrypt)
- [SHA-256 specification](https://en.wikipedia.org/wiki/SHA-2)
- [Password Hashing Competition](https://password-hashing.net/)
- [OWASP Password Storage](https://owasp.org/www-project-cheat-sheets/)

---

**Implémenté le** : 19 Novembre 2025
**Version** : 2.0.0 (SHA-256 + bcrypt)
**Status** : ✅ Production Ready
**Tests** : 100% passing (12/12)
