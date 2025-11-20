import os
import uuid
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

# Configuration AWS S3
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

# Initialiser le client S3
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def upload_file_to_s3(file_content: bytes, filename: str, content_type: str) -> dict:
    """
    Upload un fichier vers S3 et retourne l'URL

    Args:
        file_content: Contenu du fichier en bytes
        filename: Nom du fichier
        content_type: Type MIME du fichier

    Returns:
        dict avec 'url' et 'filename'
    """
    try:
        # Générer un nom unique pour le fichier
        file_extension = filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        s3_key = f"products/{unique_filename}"

        # Upload vers S3
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type
        )

        # Construire l'URL publique
        url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"

        return {
            "url": url,
            "filename": unique_filename,
            "s3_key": s3_key
        }
    except ClientError as e:
        raise Exception(f"Erreur lors de l'upload vers S3: {str(e)}")

def delete_file_from_s3(filename: str) -> bool:
    """
    Supprime un fichier de S3

    Args:
        filename: Nom du fichier ou URL complète

    Returns:
        bool: True si supprimé avec succès
    """
    try:
        # Si c'est une URL complète, extraire le nom du fichier
        if filename.startswith('http'):
            # Extraire le nom du fichier de l'URL
            filename = filename.split('/')[-1]

        s3_key = f"products/{filename}"

        # Supprimer de S3
        s3_client.delete_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key
        )

        return True
    except ClientError as e:
        raise Exception(f"Erreur lors de la suppression de S3: {str(e)}")

def check_s3_configuration() -> bool:
    """
    Vérifie si la configuration S3 est correcte

    Returns:
        bool: True si la configuration est valide
    """
    try:
        if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
            return False

        # Tester la connexion en listant les objets du bucket
        s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
        return True
    except:
        return False
