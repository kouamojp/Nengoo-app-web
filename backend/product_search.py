"""
Recherche de produits tolérante aux fautes, aux accents et aux synonymes.

Le catalogue est petit (quelques centaines de produits) : l'index est construit
en mémoire à partir des produits candidats, sans service externe. Pour un
catalogue de plusieurs dizaines de milliers de produits, passer à Atlas Search.

Score d'un produit : pour chaque mot de la recherche, la meilleure
correspondance trouvée dans ses champs (nom, catégorie, marque, mots-clés,
description), pondérée par le champ. Les produits qui contiennent tous les
mots passent devant ; s'il n'y en a aucun, ceux qui en contiennent au moins un.
"""
import re
import unicodedata
from collections import defaultdict
from typing import Dict, Iterable, List, Optional, Tuple

FIELD_WEIGHTS = {"name": 3.0, "category": 2.0, "brand": 2.0, "tags": 1.5, "description": 1.0}

# Mots qui ne disent rien du produit
STOP_WORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "d", "l", "et", "ou", "a", "au", "aux",
    "en", "pour", "avec", "sans", "sur", "par", "the", "and", "for", "of", "with",
}

# Groupes de synonymes (forme normalisée, sans accents, au singulier)
SYNONYMS = [
    {"telephone", "portable", "smartphone", "cellulaire", "phone", "mobile"},
    {"chaussure", "soulier", "basket", "sneaker", "tennis", "shoe"},
    {"babouche", "barbouche", "sandale", "claquette", "mule"},
    {"robe", "dress"},
    {"sac", "sacoche", "bag"},
    {"pagne", "wax", "tissu"},
    {"ordinateur", "laptop", "pc", "computer"},
    {"ecouteur", "airpod", "earphone", "oreillette"},
    {"chargeur", "charger"},
    {"televiseur", "television", "tv", "tele"},
    {"refrigerateur", "frigo", "frigidaire"},
    {"montre", "watch"},
    {"parfum", "perfume", "fragrance"},
    {"meche", "perruque", "wig", "tissage"},
    {"tshirt", "teeshirt", "tee"},
    {"culotte", "short"},
    {"jean", "djean", "denim"},
    {"marmite", "casserole", "cocotte"},
    {"assiette", "vaisselle"},
    {"enfant", "kid", "bebe"},
    {"femme", "dame"},
    {"homme", "monsieur"},
]
_SYNONYMS_OF: Dict[str, set] = {}
for _group in SYNONYMS:
    for _word in _group:
        _SYNONYMS_OF.setdefault(_word, set()).update(_group - {_word})


def _strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def _stem(word: str) -> str:
    # Pluriels courants : robes → robe, chapeaux → chapeau
    if len(word) > 3 and word.endswith("x") and word[-2] in "aeu":
        return word[:-1]
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def tokenize(text: Optional[str]) -> List[str]:
    text = _strip_accents((text or "").lower())
    text = text.replace("t-shirt", "tshirt").replace("tee shirt", "tshirt")
    words = re.findall(r"[a-z0-9]+", text)
    return [_stem(w) for w in words if w not in STOP_WORDS]


def _max_typos(word: str) -> int:
    if len(word) <= 3:
        return 0
    return 1 if len(word) <= 7 else 2


def _distance(a: str, b: str, limit: int) -> int:
    """Distance de Levenshtein, arrêtée dès qu'elle dépasse limit."""
    if abs(len(a) - len(b)) > limit:
        return limit + 1
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        if min(current) > limit:
            return limit + 1
        previous = current
    return previous[-1]


def _term_matches(term: str, vocabulary: Iterable[str]) -> Dict[str, float]:
    """Mots du catalogue qui correspondent à un mot recherché, avec leur poids."""
    matches: Dict[str, float] = {}
    synonyms = _SYNONYMS_OF.get(term, set())
    typos = _max_typos(term)
    for word in vocabulary:
        if word == term:
            score = 1.0
        elif word in synonyms:
            score = 0.85
        elif len(term) >= 3 and word.startswith(term):
            score = 0.8
        elif typos and _distance(term, word, typos) <= typos:
            score = 0.7
        else:
            continue
        matches[word] = max(score, matches.get(word, 0))
    return matches


def search_products(products: List[dict], query: str, category_names: Optional[Dict[str, str]] = None) -> List[dict]:
    """Produits correspondant à la recherche, les plus pertinents d'abord."""
    return search_products_detailed(products, query, category_names)[0]


def search_products_detailed(products: List[dict], query: str,
                             category_names: Optional[Dict[str, str]] = None) -> Tuple[List[dict], bool]:
    """(résultats, vrai si au moins un produit contient tous les mots)."""
    terms = list(dict.fromkeys(tokenize(query)))
    if not terms:
        return [], False
    category_names = category_names or {}

    # Index inversé : mot → {indice du produit: meilleur poids de champ}
    index: Dict[str, Dict[int, float]] = defaultdict(dict)
    for i, product in enumerate(products):
        fields = {
            "name": product.get("name"),
            "category": category_names.get(product.get("category"), ""),
            "brand": product.get("brand"),
            "tags": " ".join(product.get("tags") or []),
            "description": product.get("description"),
        }
        for field, text in fields.items():
            weight = FIELD_WEIGHTS[field]
            words = tokenize(text)
            # Mots collés : « airfryer » trouve « Air fryer »
            if field == "name":
                words += [a + b for a, b in zip(words, words[1:])]
            for word in words:
                if index[word].get(i, 0) < weight:
                    index[word][i] = weight

    scores: Dict[int, float] = defaultdict(float)
    hits: Dict[int, int] = defaultdict(int)
    for term in terms:
        best: Dict[int, float] = {}
        for word, match in _term_matches(term, index.keys()).items():
            for i, weight in index[word].items():
                best[i] = max(best.get(i, 0), match * weight)
        for i, score in best.items():
            scores[i] += score
            hits[i] += 1

    complete = [i for i in scores if hits[i] == len(terms)]
    ranked: List[Tuple[float, int]] = sorted(
        ((scores[i], i) for i in (complete or scores)), key=lambda x: (-x[0], x[1])
    )
    return [products[i] for _, i in ranked], bool(complete)


def normalize_query(query: str) -> str:
    """Forme enregistrée dans le journal des recherches sans résultat."""
    return " ".join(tokenize(query)) or (query or "").strip().lower()
