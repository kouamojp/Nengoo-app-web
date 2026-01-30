"""
Script de test pour vérifier la configuration email
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def test_email():
    print("[CHECK] Verification de la configuration email...\n")

    # Afficher la configuration
    print(f"SMTP_HOST: {os.getenv('SMTP_HOST')}")
    print(f"SMTP_PORT: {os.getenv('SMTP_PORT')}")
    print(f"SMTP_USER: {os.getenv('SMTP_USER')}")
    print(f"EMAIL_FROM: {os.getenv('EMAIL_FROM')}")
    print(f"SMTP_SECURE: {os.getenv('SMTP_SECURE')}")
    print()

    # Créer la configuration email
    conf = ConnectionConfig(
        MAIL_USERNAME=os.getenv("SMTP_USER", "your-email@example.com"),
        MAIL_PASSWORD=os.getenv("SMTP_PASSWORD", "your-password"),
        MAIL_FROM=os.getenv("EMAIL_FROM", "your-email@example.com"),
        MAIL_PORT=int(os.getenv("SMTP_PORT", 587)),
        MAIL_SERVER=os.getenv("SMTP_HOST", "smtp.example.com"),
        MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
        MAIL_SSL_TLS=os.getenv("SMTP_SECURE", "False").lower() == "true",
        USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True").lower() == "true",
        VALIDATE_CERTS=os.getenv("VALIDATE_CERTS", "True").lower() == "true",
        TEMPLATE_FOLDER=Path(__file__).parent / 'templates',
    )

    fm = FastMail(conf)

    # Creer un email de test
    print("[EMAIL] Envoi d'un email de test...")

    message = MessageSchema(
        subject="Test Email - Nengoo",
        recipients=[os.getenv("SMTP_USER")],  # Envoyer à soi-même
        body="""
        <html>
            <body>
                <h1>Test Email Nengoo</h1>
                <p>Ceci est un email de test pour verifier la configuration SMTP.</p>
                <p>Si vous recevez cet email, la configuration fonctionne correctement !</p>
                <hr>
                <p><small>Envoye depuis le systeme de test Nengoo</small></p>
            </body>
        </html>
        """,
        subtype=MessageType.html
    )

    try:
        await fm.send_message(message)
        print("[SUCCESS] Email envoye avec succes !")
        print(f"[INFO] Verifiez votre boite de reception : {os.getenv('SMTP_USER')}")
        return True
    except Exception as e:
        print(f"[ERROR] Erreur lors de l'envoi de l'email :")
        print(f"   {type(e).__name__}: {str(e)}")
        print("\n[FIX] Suggestions de correction :")

        if "authentication" in str(e).lower() or "password" in str(e).lower():
            print("   - Vérifiez que le mot de passe d'application Gmail est correct")
            print("   - Assurez-vous d'utiliser un mot de passe d'application, pas votre mot de passe Gmail normal")
            print("   - Créez un mot de passe d'application ici : https://myaccount.google.com/apppasswords")

        if "connection" in str(e).lower() or "timeout" in str(e).lower():
            print("   - Vérifiez votre connexion Internet")
            print("   - Vérifiez que le port 587 n'est pas bloqué par un firewall")

        if "starttls" in str(e).lower():
            print("   - Essayez de changer MAIL_STARTTLS dans le .env")

        return False

if __name__ == "__main__":
    print("=" * 60)
    print("TEST DE CONFIGURATION EMAIL - NENGOO")
    print("=" * 60)
    print()

    result = asyncio.run(test_email())

    print()
    print("=" * 60)
    if result:
        print("[OK] Configuration email : OK")
    else:
        print("[ERROR] Configuration email : ERREUR")
    print("=" * 60)
