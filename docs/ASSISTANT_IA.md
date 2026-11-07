# Assistant Nengoo

Conseiller d'achat en langage naturel, sur le site et dans l'application (cahier
des charges §5). Le site et l'app appellent la même route, `POST /api/assistant/chat` ;
les clés d'IA restent sur le serveur et le client ne choisit jamais le modèle.

```
Client → /api/assistant/chat → modèle IA ↔ outils du catalogue → réponse contrôlée
```

Code : `backend/ai_providers.py` (fournisseurs, routage), `backend/assistant.py`
(conversation, garde-fous, cache, coûts), `backend/assistant_tools.py` (accès aux
données), `backend/routers/assistant.py` (API).

## Mise en service

Ajouter au `.env` du backend au moins une clé, puis redémarrer :

```ini
# Fournisseur par défaut : kimi, deepseek, openai ou gemini
AI_PROVIDER=deepseek

# Fournisseur par besoin (facultatif, sinon AI_PROVIDER)
AI_PROVIDER_SEARCH=deepseek
AI_PROVIDER_ADVICE=kimi
AI_PROVIDER_COMPARE=kimi
AI_PROVIDER_SUPPORT=deepseek

# Essayés dans l'ordre si les précédents échouent
AI_FALLBACK_PROVIDERS=gemini,openai

DEEPSEEK_API_KEY=
KIMI_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# Plafond de dépense par jour, en dollars. Au-delà : réponses sans IA
AI_DAILY_BUDGET_USD=2
```

Sans aucune clé, l'assistant fonctionne quand même : il cherche directement dans
le catalogue (budget, ville et mots-clés lus dans le message).

## Choix du modèle selon le besoin

Chaque message est classé sans appel à l'IA, donc sans coût :

| Besoin | Exemple | Variable |
|---|---|---|
| `search` | « Téléphone Android à 80 000 FCFA » | `AI_PROVIDER_SEARCH` |
| `advice` | « Un ordinateur pour faire Excel » | `AI_PROVIDER_ADVICE` |
| `compare` | « Compare ces deux modèles » | `AI_PROVIDER_COMPARE` |
| `support` | « Combien coûte la livraison à Douala ? » | `AI_PROVIDER_SUPPORT` |

Ordre d'essai : fournisseur du besoin, `AI_PROVIDER`, `AI_FALLBACK_PROVIDERS`, puis
réponse sans IA. Un fournisseur sans clé est ignoré. Sans aucune de ces variables,
tous ceux qui ont une clé sont essayés.

| Fournisseur | Modèle par défaut | Entrée / sortie ($ pour 1 M de jetons) |
|---|---|---|
| `deepseek` | `deepseek-flash` | 0,30 / 1,20 (tarif de pointe) |
| `kimi` | `kimi-k3` | 3,00 / 15,00 |
| `openai` | `gpt-5-nano` | 0,05 / 0,40 |
| `gemini` | `gemini-3.1-flash-lite` | 0,25 / 1,50 |

Tarifs relevés le 6 novembre 2026 ; celui de Kimi vient de sources tierces, la page
officielle n'a pas pu être consultée. Ils ne servent qu'à estimer les coûts : à
revoir dans `ai_providers.py` ou avec les variables ci-dessous.

Tout se surcharge sans toucher au code, avec `<NOM>_MODEL`, `<NOM>_BASE_URL`,
`<NOM>_PRICE_INPUT` et `<NOM>_PRICE_OUTPUT` (ex. `KIMI_MODEL=kimi-k3.1-pro`). Pour
ajouter un fournisseur compatible avec `/chat/completions`, ajouter une ligne à
`PROVIDERS`.

## Autres réglages

| Variable | Défaut | Rôle |
|---|---|---|
| `AI_ASSISTANT_ENABLED` | `true` | `false` coupe l'assistant (réponse 503) |
| `AI_MAX_OUTPUT_TOKENS` | `1500` | Longueur maximale d'une réponse du modèle |
| `AI_TIMEOUT_SECONDS` | `20` | Attente maximale d'un appel au modèle |
| `AI_TOTAL_TIMEOUT_SECONDS` | `40` | Attente totale, secours compris |
| `AI_RATE_PER_IP_HOUR` | `120` | Messages par heure et par adresse IP |
| `AI_RATE_PER_CONVERSATION_HOUR` | `30` | Messages par heure et par conversation |

## Ce que le modèle ne peut pas inventer

Les consignes interdisent d'inventer, mais le serveur le vérifie aussi :

- le modèle ne lit les données qu'à travers des outils en lecture seule : produits
  en vente et en stock, tarifs de livraison. Aucune commande, aucun compte ;
- les fiches affichées sont forcément des produits renvoyés par ces outils ;
- un montant en FCFA, ou un délai de livraison, absent des données fait remplacer
  le texte par une phrase neutre ; les fiches restent affichées. Le compteur
  « Réponses corrigées » de l'admin suit ces cas ;
- les liens externes sont retirés, car une description de vendeur peut en contenir.

Le contrôle porte sur les montants et les délais de livraison : une caractéristique
inventée dans le texte n'est pas détectée automatiquement. La fiche affichée en
dessous reste la référence, et l'interface le rappelle.

## Confidentialité

Les numéros de téléphone et e-mails sont masqués avant tout envoi à un fournisseur.
Le serveur n'enregistre ni le texte des messages, ni l'adresse IP : uniquement des
compteurs (fournisseur, jetons, coût, durée), conservés 180 jours. La conversation
vit dans l'onglet du navigateur ou l'écran de l'app.

Le texte des questions part chez le fournisseur choisi, et DeepSeek et Moonshot (Kimi)
sont des sociétés chinoises. La politique à publier est dans
`docs/POLITIQUE_CONFIDENTIALITE.md` : si la liste des fournisseurs ou ces durées
changent, la mettre à jour.

## Suivi

Admin → **Assistant IA** : conversations, coût par conversation, dépense du jour,
cache, réponses sans IA, secours, fournisseurs actifs. Les recherches sans résultat
alimentent l'écran **Recherches sans résultat** existant.

Les réponses d'une question isolée sont gardées 1 h en cache (collection `ai_cache`),
et ne sont resservies que si le prix et le stock des produits cités n'ont pas changé.

## Limites connues

- Les réponses arrivent d'un bloc, sans streaming : plus fiable sur réseau mobile
  faible et derrière le proxy cPanel. Comptez quelques secondes par réponse.
- La recherche repose sur la recherche tolérante existante, enrichie par les
  mots-clés que choisit le modèle. Pas d'embeddings : inutile à la taille actuelle
  du catalogue.
- Les limites par IP et par conversation sont en mémoire, par processus, et
  l'adresse IP vient de `X-Forwarded-For`. `AI_DAILY_BUDGET_USD`, partagé en base,
  est le vrai plafond de dépense.
- La ville recherchée est celle du vendeur : les produits n'ont pas de ville propre.

## Essais

```bash
cd backend && python -m pytest tests/test_assistant.py
cd nengoo-front && flutter test test/assistant_test.dart
```
