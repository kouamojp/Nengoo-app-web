"""
Migration des catégories (phase 2) : arborescence de category_tree.TREE.

Par défaut le script SIMULE et affiche ce qu'il ferait. Avec --apply il écrit
et enregistre l'état avant modification de chaque document dans un journal
JSON, que --undo rejoue pour tout remettre comme avant.

Étapes :
1. Identifiant fixe pour les catégories qui n'en ont pas.
2. Produits dont la catégorie est écrite par son nom : remplacée par l'id.
3. Catégories de l'arborescence : existantes renommées et rangées (leur id
   est gardé), manquantes créées. Les autres catégories ne sont pas touchées.
4. Slugs de produits en double : suffixe -2, -3…
5. Index (uniques sur les id et slugs, simples sur les filtres courants).

Exemples, depuis backend/ :
  python -m migrations.categories_2026_11                  # simulation, base locale nengoo_test
  python -m migrations.categories_2026_11 --apply
  python -m migrations.categories_2026_11 --undo ~/nengoo-backups/migration-categories-....json
  python -m migrations.categories_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply
"""
import argparse
import collections
import datetime
import os
import sys
import uuid
from urllib.parse import urlparse

from bson import ObjectId, json_util
from pymongo import ASCENDING, MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from category_tree import TREE, normalize_name  # noqa: E402

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


_MISSING = "__absent__"


class Journal:
    """Garde la valeur d'origine de chaque champ avant sa première écriture
    (les documents sont lus en partie : on ne remplace jamais un document entier)."""

    def __init__(self, db, apply):
        self.db, self.apply, self.entries, self.index = db, apply, [], {}
        # Index créés par la migration : retirés en premier à l'annulation
        self.indexes = []

    def update(self, col, doc, changes):
        key = (col, doc["_id"])
        if key not in self.index:
            self.index[key] = {"col": col, "_id": doc["_id"], "before": {}}
            self.entries.append(self.index[key])
        before = self.index[key]["before"]
        if before is not None:
            for field in changes:
                before.setdefault(field, doc.get(field, _MISSING))
        doc.update(changes)
        if self.apply:
            self.db[col].update_one({"_id": doc["_id"]}, {"$set": changes})

    def insert(self, col, doc):
        doc.setdefault("_id", ObjectId())
        entry = {"col": col, "_id": doc["_id"], "before": None}
        self.entries.append(entry)
        self.index[(col, doc["_id"])] = entry
        if self.apply:
            self.db[col].insert_one(doc)

    def save(self, log_dir, prefix="migration-categories"):
        os.makedirs(log_dir, exist_ok=True)
        path = os.path.join(log_dir, datetime.datetime.now().strftime(f"{prefix}-%Y%m%d-%H%M%S.json"))
        with open(path, "w", encoding="utf-8") as f:
            f.write(json_util.dumps({"database": self.db.name, "indexes": self.indexes,
                                     "entries": self.entries}, indent=1))
        return path


def migrate(db, apply):
    journal = Journal(db, apply)
    report = collections.Counter()
    categories = list(db.categories.find())
    products = list(db.products.find({}, {"_id": 1, "id": 1, "category": 1, "slug": 1, "name": 1}))

    # 1. Identifiants manquants
    for cat in categories:
        if not cat.get("id"):
            journal.update("categories", cat, {"id": f"cat_{uuid.uuid4().hex[:8]}"})
            report["catégories sans id corrigées"] += 1
            print(f"  id      {cat['name'].strip()!r} -> {cat['id']}")

    # 2. Catégorie écrite par son nom
    by_name = {normalize_name(c["name"]): c for c in categories}
    valid_ids = {c["id"] for c in categories}
    for product in products:
        value = product.get("category")
        if value not in valid_ids and normalize_name(value) in by_name:
            journal.update("products", product, {"category": by_name[normalize_name(value)]["id"]})
            report["produits reclassés par le nom de leur catégorie"] += 1

    # 3. Arborescence
    def place(node, parent_id, order):
        changes = {"name": node["name"], "nameEn": node["nameEn"], "parentId": parent_id, "order": order}
        existing = by_name.get(normalize_name(node["keep"])) if node["keep"] else None
        existing = existing or by_name.get(normalize_name(node["name"]))
        if existing:
            old_name = (existing.get("name") or "").strip()
            if normalize_name(old_name) != normalize_name(node["name"]):
                # Les liens /catalog/<ancien nom> restent valides
                changes["formerNames"] = sorted({*existing.get("formerNames", []), old_name})
            diff = {k: v for k, v in changes.items() if existing.get(k) != v}
            if diff:
                journal.update("categories", existing, diff)
                report["catégories mises à jour"] += 1
            return existing["id"]
        doc = {"id": f"cat_{uuid.uuid4().hex[:8]}", "description": None, "image": None, **changes}
        journal.insert("categories", doc)
        by_name[normalize_name(doc["name"])] = doc
        report["catégories créées"] += 1
        return doc["id"]

    used = set()
    for i, top in enumerate(TREE):
        top_id = place(top, None, (i + 1) * 10)
        used.add(top_id)
        for j, sub in enumerate(top["subs"]):
            used.add(place(sub, top_id, (j + 1) * 10))
    for cat in categories:
        if cat["id"] not in used:
            print(f"  hors arborescence, non modifiée : {cat['name'].strip()!r}")

    # 4. Slugs en double
    taken = collections.Counter(p.get("slug") for p in products if p.get("slug"))
    seen = set()
    for product in products:
        slug = product.get("slug")
        if not slug:
            continue
        if slug in seen:
            n = 2
            while f"{slug}-{n}" in taken:
                n += 1
            new_slug = f"{slug}-{n}"
            taken[new_slug] += 1
            journal.update("products", product, {"slug": new_slug})
            report["slugs en double corrigés"] += 1
            print(f"  slug    {slug} -> {new_slug}")
        seen.add(slug)

    # 5. Index (idempotents)
    wanted = [
        ("categories", "id", {"unique": True, "name": "id_unique"}),
        ("products", "id", {"unique": True, "name": "id_unique"}),
        ("products", "slug", {"unique": True, "name": "slug_unique",
                              "partialFilterExpression": {"slug": {"$type": "string"}}}),
    ] + [("products", field, {"name": field}) for field in ("category", "sellerId", "status")]
    for col, field, options in wanted:
        if options["name"] in db[col].index_information():
            continue
        journal.indexes.append([col, options["name"]])
        report["index créés"] += 1
        if apply:
            db[col].create_index([(field, ASCENDING)], **options)

    valid_ids = {c["id"] for c in by_name.values()}
    report["produits restant sans catégorie valide"] = sum(1 for p in products if p.get("category") not in valid_ids)
    return journal, report


def undo(db, path):
    data = json_util.loads(open(path, encoding="utf-8").read())
    if data["database"] != db.name:
        sys.exit(f"Ce journal concerne la base {data['database']}, pas {db.name}.")
    for col, name in data.get("indexes", []):
        db[col].drop_index(name)
    for entry in reversed(data["entries"]):
        if entry["before"] is None:
            db[entry["col"]].delete_one({"_id": entry["_id"]})
            continue
        restore = {k: v for k, v in entry["before"].items() if v != _MISSING}
        remove = {k: "" for k, v in entry["before"].items() if v == _MISSING}
        update = {**({"$set": restore} if restore else {}), **({"$unset": remove} if remove else {})}
        if update:
            db[entry["col"]].update_one({"_id": entry["_id"]}, update)
    print(f"{len(data['entries'])} document(s) remis dans leur état d'origine.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="mongodb://127.0.0.1:27017")
    parser.add_argument("--db", default="nengoo_test")
    parser.add_argument("--apply", action="store_true", help="écrire (sinon simulation)")
    parser.add_argument("--undo", metavar="JOURNAL", help="annuler une migration à partir de son journal")
    parser.add_argument("--allow-remote", action="store_true", help="autoriser une base qui n'est pas locale")
    parser.add_argument("--log-dir", default=os.path.expanduser("~/nengoo-backups"))
    args = parser.parse_args()

    hosts = {h.split(":")[0].strip("[]") for h in (urlparse(args.url).netloc.split("@")[-1]).split(",")}
    if not hosts <= LOCAL_HOSTS and not args.allow_remote and (args.apply or args.undo):
        sys.exit("Base distante : ajoutez --allow-remote après avoir fait une sauvegarde.")
    db = MongoClient(args.url, serverSelectionTimeoutMS=20000)[args.db]

    if args.undo:
        undo(db, args.undo)
        return
    print(f"{'MIGRATION' if args.apply else 'SIMULATION'} sur {args.db}")
    journal, report = migrate(db, args.apply)
    for label, count in report.items():
        print(f"{count:5d}  {label}")
    if args.apply:
        print("Journal d'annulation :", journal.save(args.log_dir))
    else:
        print("Rien n'a été écrit. Relancez avec --apply pour appliquer.")


if __name__ == "__main__":
    main()
