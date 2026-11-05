"""
E-mail unique par type de compte.

1. E-mails des acheteurs et vendeurs : minuscules, espaces retirés.
2. Adresses partagées par plusieurs comptes : listées, jamais modifiées. Choisir
   quel compte garde l'adresse revient à l'équipe.
3. Index uniques : créés seulement s'il ne reste aucun doublon dans la collection.
   Relancer la migration après avoir réglé les doublons.

Même usage que categories_2026_11 : simulation par défaut, --apply pour
écrire, --undo JOURNAL pour annuler.
  python -m migrations.unique_emails_2026_11
  python -m migrations.unique_emails_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply
"""
import argparse
import collections
import os
import sys
from urllib.parse import urlparse

from pymongo import ASCENDING, MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from account_email import normalize_email  # noqa: E402
from migrations.categories_2026_11 import LOCAL_HOSTS, Journal, undo  # noqa: E402

# Un compte sans e-mail (client invité) n'entre pas dans l'index
ACCOUNTS = (
    ("users", {"type": "buyer"}, "unique_buyer_email", {"type": "buyer", "email": {"$gt": ""}}),
    ("sellers", {}, "unique_seller_email", {"email": {"$gt": ""}}),
)
FIELDS = {"_id": 1, "id": 1, "email": 1, "name": 1, "businessName": 1, "whatsapp": 1, "status": 1}


def migrate(db, apply, journal=None):
    journal = journal or Journal(db, apply)
    report = collections.Counter()

    for col, query, index_name, partial in ACCOUNTS:
        groups = collections.defaultdict(list)
        for doc in db[col].find(query, FIELDS):
            raw = doc.get("email")
            if not isinstance(raw, str):
                continue
            email = normalize_email(raw)
            if email != raw:
                journal.update(col, doc, {"email": email})
                report[f"e-mails normalisés ({col})"] += 1
            if email:
                groups[email].append(doc)

        duplicates = {email: docs for email, docs in groups.items() if len(docs) > 1}
        for email, docs in duplicates.items():
            print(f"  doublon {col}: {email}")
            for doc in docs:
                print(f"    {doc.get('id')}  {doc.get('businessName') or doc.get('name')!r}"
                      f"  {doc.get('whatsapp')}  {doc.get('status')}")
        if duplicates:
            report[f"adresses en double, index non créé ({col})"] = len(duplicates)
        elif index_name not in db[col].index_information():
            if apply:
                db[col].create_index([("email", ASCENDING)], name=index_name, unique=True,
                                     partialFilterExpression=partial)
                journal.indexes.append((col, index_name))
            report[f"index unique {'créé' if apply else 'à créer'} ({col})"] += 1
    return journal, report


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="mongodb://127.0.0.1:27017")
    parser.add_argument("--db", default="nengoo_test")
    parser.add_argument("--apply", action="store_true", help="écrire (sinon simulation)")
    parser.add_argument("--undo", metavar="JOURNAL", help="annuler à partir du journal")
    parser.add_argument("--allow-remote", action="store_true", help="autoriser une base qui n'est pas locale")
    parser.add_argument("--log-dir", default=os.path.join(os.path.dirname(__file__), "logs"))
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
        if args.apply and (journal.entries or journal.indexes):
            print("Journal d'annulation :", journal.save(args.log_dir, prefix="migration-emails"))
    for label, count in report.items():
        print(f"{count:5d}  {label}")
    if not report:
        print("Rien à faire.")


if __name__ == "__main__":
    main()
