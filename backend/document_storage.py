"""
Stockage des documents numériques sur S3.

- Originaux et exemplaires des acheteurs : bucket PRIVÉ DOCUMENTS_S3_BUCKET,
  jamais lisible publiquement. Il doit être distinct de S3_BUCKET_NAME (photos
  publiques) : sans lui, la boutique de documents reste fermée (503) plutôt que
  de risquer des fichiers payants publics.
- Aperçus gratuits : bucket public existant (S3_BUCKET_NAME), dossier uploads/.
- Téléchargement : lien signé de quelques minutes, créé par le serveur.

Les tests remplacent `storage` par un stockage en mémoire.
"""
import asyncio
import os
from typing import Optional

import boto3
from botocore.exceptions import ClientError


class StorageUnavailable(Exception):
    """Stockage non configuré ou injoignable."""


class S3DocumentStorage:
    def _env(self):
        key = os.environ.get("AWS_ACCESS_KEY_ID")
        secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
        region = os.environ.get("AWS_REGION")
        private = os.environ.get("DOCUMENTS_S3_BUCKET", "").strip()
        public = os.environ.get("S3_BUCKET_NAME", "").strip()
        if not all([key, secret, region, private, public]) or private == public:
            raise StorageUnavailable(
                "Stockage des documents non configuré (DOCUMENTS_S3_BUCKET, bucket privé distinct).")
        return key, secret, region, private, public

    def _client(self, region: Optional[str] = None):
        key, secret, default_region, _, _ = self._env()
        return boto3.client(
            "s3",
            aws_access_key_id=key,
            aws_secret_access_key=secret,
            region_name=region or os.environ.get("DOCUMENTS_S3_REGION") or default_region,
            config=boto3.session.Config(signature_version="s3v4"),
        )

    async def _run(self, fn, *args, **kwargs):
        try:
            return await asyncio.to_thread(fn, *args, **kwargs)
        except ClientError as error:
            raise StorageUnavailable(str(error)) from error

    async def upload_form(self, key: str, max_bytes: int, expires: int = 3600) -> dict:
        """Formulaire d'envoi direct du navigateur vers le bucket privé
        (taille plafonnée par S3 lui-même)."""
        private = self._env()[3]
        return await self._run(
            self._client().generate_presigned_post,
            private, key,
            Fields={"Content-Type": "application/pdf"},
            Conditions=[{"Content-Type": "application/pdf"}, ["content-length-range", 1, max_bytes]],
            ExpiresIn=expires,
        )

    async def size(self, key: str) -> Optional[int]:
        private = self._env()[3]

        def head():
            try:
                return self._client().head_object(Bucket=private, Key=key)["ContentLength"]
            except ClientError as error:
                # Sans s3:ListBucket, S3 répond 403 (et non 404) pour un fichier
                # absent ; les droits de lecture, eux, sont vérifiés par read()
                if error.response.get("Error", {}).get("Code") in ("403", "404", "NoSuchKey", "NotFound"):
                    return None
                raise
        return await self._run(head)

    async def read(self, key: str) -> bytes:
        private = self._env()[3]
        return await self._run(lambda: self._client().get_object(Bucket=private, Key=key)["Body"].read())

    async def write_private(self, key: str, data: bytes) -> None:
        private = self._env()[3]
        await self._run(self._client().put_object, Bucket=private, Key=key, Body=data,
                        ContentType="application/pdf")

    async def delete_private(self, key: str) -> None:
        private = self._env()[3]
        await self._run(self._client().delete_object, Bucket=private, Key=key)

    async def write_public(self, key: str, data: bytes) -> str:
        _, _, region, _, public = self._env()
        await self._run(self._client(region).put_object, Bucket=public, Key=key, Body=data,
                        ContentType="application/pdf", CacheControl="public, max-age=86400")
        return f"https://{public}.s3.{region}.amazonaws.com/{key}"

    async def download_url(self, key: str, filename: str, expires: int = 300) -> str:
        private = self._env()[3]
        return await self._run(
            self._client().generate_presigned_url,
            "get_object",
            Params={
                "Bucket": private, "Key": key,
                "ResponseContentType": "application/pdf",
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=expires,
        )


storage = S3DocumentStorage()
