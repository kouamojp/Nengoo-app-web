
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_address, subject, body):
    """
    Sends an email using SMTP configuration from environment variables.
    """
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SENDER_EMAIL", smtp_user)

    if not all([smtp_server, smtp_port, smtp_user, smtp_password]):
        print("Email configuration is incomplete. Skipping email.")
        # In a real application, you'd want to log this error.
        return False

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = to_address
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # Secure the connection
            server.login(smtp_user, smtp_password)
            server.sendmail(sender_email, to_address, message.as_string())
            print(f"Email sent successfully to {to_address}")
            return True
    except smtplib.SMTPException as e:
        print(f"Failed to send email to {to_address}. Error: {e}")
        # In a real application, you'd want to log this error more robustly.
        return False

def generate_seller_notification_email(seller_name, order_id, products):
    """
    Generates the subject and body for a new order notification email to a seller.
    """
    subject = f"Nouvelle commande reçue ({order_id}) - Vous avez des articles à préparer !"

    product_list = ""
    for product in products:
        product_list += f"- {product['name']} (Quantité: {product['quantity']})\n"

    body = f"""
Bonjour {seller_name},

Bonne nouvelle ! Une nouvelle commande vient d'être passée pour un ou plusieurs de vos articles.

Numéro de commande : {order_id}

Articles concernés :
{product_list}

Veuillez vous connecter à votre tableau de bord vendeur pour voir les détails complets de la commande et la préparer pour l'expédition.

Merci,
L'équipe Nengoo
"""
    return subject, body
