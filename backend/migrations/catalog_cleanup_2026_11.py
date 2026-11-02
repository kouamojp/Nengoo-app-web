"""
Nettoyage du catalogue (phase 2, suite).

1. Prix promo supérieur ou égal au prix normal : le prix promo est retiré
   (la commande facture le prix promo quand il existe ; le client paiera le
   prix normal, plus bas ou égal).
2. Vendeurs sans identifiant : identifiant attribué.
3. Villes des vendeurs, commandes et points de retrait : écriture uniforme
   (« DOUALA » → « Douala », espaces superflus retirés).

Même usage que categories_2026_11 : simulation par défaut, --apply pour
écrire, --undo JOURNAL pour annuler.
  python -m migrations.catalog_cleanup_2026_11
  python -m migrations.catalog_cleanup_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply
"""
import argparse
import collections
import os
import sys
import uuid
from urllib.parse import urlparse

from pymongo import MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from catalog_rules import normalize_city  # noqa: E402
from migrations.categories_2026_11 import LOCAL_HOSTS, Journal, undo  # noqa: E402


def migrate(db, apply, journal=None):
    journal = journal or Journal(db, apply)
    report = collections.Counter()

    for product in db.products.find({"promoPrice": {"$gt": 0}}, {"_id": 1, "name": 1, "price": 1, "promoPrice": 1}):
        if product.get("price") and product["promoPrice"] >= product["price"]:
            print(f"  promo   {product['name'].strip()[:30]!r}: {product['promoPrice']:g} retiré, prix {product['price']:g}")
            journal.update("products", product, {"promoPrice": None})
            report["prix promo retirés (≥ prix normal)"] += 1

    for seller in db.sellers.find({"$or": [{"id": None}, {"id": ""}, {"id": {"$exists": False}}]}, {"_id": 1, "businessName": 1}):
        new_id = f"seller_{uuid.uuid4().hex[:8]}"
        print(f"  vendeur {seller.get('businessName')!r} -> {new_id}")
        journal.update("sellers", seller, {"id": new_id})
        report["vendeurs sans id corrigés"] += 1

    for col, field in (("sellers", "city"), ("orders", "shippingCity"), ("pickupPoints", "city")):
        for doc in db[col].find({field: {"$type": "string"}}, {"_id": 1, field: 1}):
            city = normalize_city(doc[field])
            if city != doc[field]:
                print(f"  ville   {col}: {doc[field]!r} -> {city!r}")
                journal.update(col, doc, {field: city})
                report[f"villes uniformisées ({col})"] += 1
    return journal, report


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="mongodb://127.0.0.1:27017")
    parser.add_argument("--db", default="nengoo_test")
    parser.add_argument("--apply", action="store_true", help="écrire (sinon simulation)")
    parser.add_argument("--undo", metavar="JOURNAL", help="annuler à partir du journal")
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
    journal = Journal(db, args.apply)
    try:
        _, report = migrate(db, args.apply, journal)
    finally:
        # Même après une erreur : ce qui a été écrit doit pouvoir être annulé
        if args.apply and journal.entries:
            print("Journal d'annulation :", journal.save(args.log_dir, prefix="migration-cleanup"))
    for label, count in report.items():
        print(f"{count:5d}  {label}")
    if not report:
        print("Rien à faire.")


if __name__ == "__main__":
    main()
