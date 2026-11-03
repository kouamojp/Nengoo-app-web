"""
SMS de confirmation et de suivi des commandes.

Fournisseur choisi par SMS_PROVIDER dans le .env :
- « africastalking » : AT_USERNAME, AT_API_KEY, SMS_SENDER_ID (facultatif) ;
- « twilio » : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM ;
- absent ou « log » : rien n'est envoyé, le message est écrit dans le journal.

Les envois partent en tâche de fond : un fournisseur lent ou en panne ne
bloque jamais une commande.
"""
import logging
import os
import unicodedata
from typing import Optional

import requests

from catalog_rules import whatsapp_digits

logger = logging.getLogger(__name__)
TIMEOUT = 10

# États qui déclenchent un SMS au client (les autres restent visibles au suivi)
NOTIFIED_STATUSES = {
    "confirmed": "est confirmee par le vendeur",
    "shipped": "a ete expediee",
    "out_for_delivery": "est en cours de livraison",
    "delivered": "a ete livree. Merci de votre confiance",
    "cancelled": "a ete annulee",
}


def _plain(text: str) -> str:
    """Sans accents : un SMS en alphabet GSM tient en 160 caractères au lieu de 70."""
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def order_created_text(order_id: str, total: float, seller: str, delivery_code: Optional[str] = None) -> str:
    # Le code de remise est demandé par le livreur : il tient dans le même SMS
    code = f" Code livraison: {delivery_code}." if delivery_code else ""
    return _plain(f"Nengoo: commande {order_id} recue ({int(total)} FCFA, {seller.strip()}).{code} "
                  f"Suivi: nengoo.com/suivi-commande")


def order_status_text(order_id: str, status: str) -> Optional[str]:
    phrase = NOTIFIED_STATUSES.get(status)
    if not phrase:
        return None
    return _plain(f"Nengoo: votre commande {order_id} {phrase}. Suivi: nengoo.com/suivi-commande")


def provider() -> str:
    return (os.environ.get("SMS_PROVIDER") or "log").strip().lower()


def send_sms(phone: Optional[str], text: str) -> bool:
    """Envoie un SMS ; renvoie True si le fournisseur l'a accepté."""
    digits = whatsapp_digits(phone)
    if not digits or not text:
        return False
    to = f"+{digits}"
    name = provider()
    try:
        if name == "africastalking":
            data = {"username": os.environ["AT_USERNAME"], "to": to, "message": text}
            if os.environ.get("SMS_SENDER_ID"):
                data["from"] = os.environ["SMS_SENDER_ID"]
            response = requests.post(
                "https://api.africastalking.com/version1/messaging",
                data=data,
                headers={"apiKey": os.environ["AT_API_KEY"], "Accept": "application/json"},
                timeout=TIMEOUT,
            )
        elif name == "twilio":
            sid = os.environ["TWILIO_ACCOUNT_SID"]
            response = requests.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                data={"To": to, "From": os.environ["TWILIO_FROM"], "Body": text},
                auth=(sid, os.environ["TWILIO_AUTH_TOKEN"]),
                timeout=TIMEOUT,
            )
        else:
            logger.info("SMS non envoyé (SMS_PROVIDER absent) à %s : %s", to[:-4] + "****", text)
            return False
        if response.status_code >= 300:
            logger.warning("SMS refusé par %s (%s) : %s", name, response.status_code, response.text[:200])
            return False
        return True
    except KeyError as missing:
        logger.error("SMS : variable %s absente du .env pour le fournisseur %s", missing, name)
    except requests.RequestException as exc:
        logger.warning("SMS : %s injoignable : %s", name, exc)
    return False
