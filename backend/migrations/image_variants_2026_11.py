"""
Versions réduites (WebP 400 et 1000 px) des photos produit déjà en ligne, et
en-tête de cache sur les originaux. Voir image_variants.py.

Par défaut le script SIMULE : il compte les photos à traiter et, avec
--sample N, mesure le gain sur N photos (lecture seule, rien n'est écrit).
--apply crée les versions sur S3 et les enregistre dans les produits ;
--limit N pour commencer par quelques produits. --undo JOURNAL supprime les
versions créées et remet les champs des produits. L'en-tête de cache ajouté
aux originaux n'est pas retiré (même contenu, sans effet sur l'affichage).

  python -m migrations.image_variants_2026_11 --url "$MONGO_URL" --db nengoo --sample 20
  python -m migrations.image_variants_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply --limit 3
  python -m migrations.image_variants_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply
"""
import argparse
import datetime
import os
import sys
from urllib.parse import urlparse

from bson import json_util
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
load_dotenv(os.path.join(ROOT, ".env"))

from image_variants import (WIDTHS, aligned_variants, key_from_url, make_variants,  # noqa: E402
                            resize_to_webp, s3_client, s3_settings, variant_key)
from migrations.categories_2026_11 import LOCAL_HOSTS  # noqa: E402


def pending(products, bucket):
    """(produit, photos sans version réduite) à traiter."""
    for product in products:
        images = product.get("images") or []
        thumbs = product.get("thumbnails") or []
        previews = product.get("previews") or []
        todo = [url for i, url in enumerate(images)
                if key_from_url(url, bucket) and not (i < len(thumbs) and thumbs[i] and i < len(previews) and previews[i])]
        if todo:
            yield product, todo


def sample(s3, settings, products, count):
    bucket = settings["S3_BUCKET_NAME"]
    before = after = done = 0
    for product, urls in pending(products, bucket):
        for url in urls:
            if done >= count:
                break
            data = s3.get_object(Bucket=bucket, Key=key_from_url(url, bucket))["Body"].read()
            small = resize_to_webp(data, WIDTHS["thumbnails"])
            before += len(data)
            after += len(small)
            done += 1
    if done:
        print(f"Échantillon de {done} photos : {before / done / 1024:.0f} Ko en moyenne à l'origine, "
              f"{after / done / 1024:.0f} Ko en version liste (-{100 - after * 100 / before:.0f} %)")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="mongodb://127.0.0.1:27017")
    parser.add_argument("--db", default="nengoo_test")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--limit", type=int, help="nombre maximal de produits à traiter")
    parser.add_argument("--sample", type=int, default=0, help="mesurer le gain sur N photos (lecture seule)")
    parser.add_argument("--undo", metavar="JOURNAL")
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--log-dir", default=os.path.expanduser("~/nengoo-backups"))
    args = parser.parse_args()

    hosts = {h.split(":")[0].strip("[]") for h in (urlparse(args.url).netloc.split("@")[-1]).split(",")}
    if not hosts <= LOCAL_HOSTS and not args.allow_remote and (args.apply or args.undo):
        sys.exit("Base distante : ajoutez --allow-remote après avoir fait une sauvegarde.")
    settings = s3_settings()
    if not settings:
        sys.exit("Variables AWS absentes du .env.")
    s3 = s3_client(settings)
    bucket = settings["S3_BUCKET_NAME"]
    db = MongoClient(args.url, serverSelectionTimeoutMS=20000)[args.db]

    if args.undo:
        data = json_util.loads(open(args.undo, encoding="utf-8").read())
        for entry in data["products"]:
            db.products.update_one({"_id": entry["_id"]}, {"$set": entry["before"]})
        for key in data["keys"]:
            s3.delete_object(Bucket=bucket, Key=key)
        print(f"{len(data['products'])} produit(s) remis, {len(data['keys'])} version(s) supprimée(s).")
        return

    products = list(db.products.find({}, {"_id": 1, "id": 1, "images": 1, "thumbnails": 1, "previews": 1}))
    todo = list(pending(products, bucket))
    if args.limit:
        todo = todo[:args.limit]
    print(f"{'MIGRATION' if args.apply else 'SIMULATION'} sur {args.db} : "
          f"{len(todo)} produit(s), {sum(len(u) for _, u in todo)} photo(s) à traiter")
    if args.sample:
        sample(s3, settings, products, args.sample)
    if not args.apply:
        print("Rien n'a été écrit. Relancez avec --apply pour appliquer.")
        return

    journal = {"database": db.name, "products": [], "keys": []}
    failed = 0
    try:
        for n, (product, urls) in enumerate(todo, 1):
            images = product.get("images") or []
            known = {url: {"thumbnails": t, "previews": p} for url, t, p in
                     zip(images, product.get("thumbnails") or [], product.get("previews") or []) if t and p}
            for url in urls:
                try:
                    known[url] = make_variants(s3, settings, url)
                    key = key_from_url(url, bucket)
                    journal["keys"] += [variant_key(key, w) for w in WIDTHS.values()]
                except Exception as exc:
                    failed += 1
                    print(f"  échec   {url[-60:]} : {exc}")
            journal["products"].append({"_id": product["_id"], "before": {
                "thumbnails": product.get("thumbnails") or [], "previews": product.get("previews") or []}})
            db.products.update_one({"_id": product["_id"], "images": images}, {"$set": aligned_variants(images, known)})
            if n % 25 == 0:
                print(f"  {n}/{len(todo)} produits")
    finally:
        # Même après une erreur : ce qui a été créé doit pouvoir être annulé
        os.makedirs(args.log_dir, exist_ok=True)
        path = os.path.join(args.log_dir, datetime.datetime.now().strftime("migration-images-%Y%m%d-%H%M%S.json"))
        open(path, "w", encoding="utf-8").write(json_util.dumps(journal))
        print(f"{len(journal['products'])} produit(s) traité(s), {len(journal['keys'])} version(s) créée(s), "
              f"{failed} photo(s) en échec")
        print("Journal d'annulation :", path)


if __name__ == "__main__":
    main()
