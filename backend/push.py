"""
Notifications push vers l'app mobile (Firebase Cloud Messaging).

Chaque appareil connecté enregistre son jeton FCM (POST /api/push/tokens) ;
`notify` enregistre une notification de la cloche ET l'envoie en push aux
appareils du compte. Sans Firebase Admin configuré (fichier de compte de
service absent), le push est simplement ignoré : la cloche fonctionne
toujours.

Les jetons refusés par FCM (application désinstallée, jeton expiré) sont
supprimés au premier envoi raté.
"""
import asyncio
import logging
from typing import Optional

from firebase_admin import messaging

from firebase_admin_config import is_firebase_initialized

logger = logging.getLogger(__name__)

MAX_TOKENS_PER_ACCOUNT = 20  # un compte sur plusieurs téléphones, sans limite folle
ANDROID_CHANNEL = "nengoo_default"  # créé par l'app (voir push_notifications.dart)

# Erreurs FCM qui signifient que le jeton ne servira plus jamais
_DEAD_TOKEN_ERRORS = (messaging.UnregisteredError, messaging.SenderIdMismatchError)


def _is_dead(exception) -> bool:
    if isinstance(exception, _DEAD_TOKEN_ERRORS):
        return True
    # Jeton mal formé : FCM répond INVALID_ARGUMENT
    return getattr(exception, "code", None) == "INVALID_ARGUMENT"


def build_message(tokens, title: str, body: str, data: dict) -> messaging.MulticastMessage:
    return messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        # Valeurs en chaînes : contrainte de FCM
        data={k: str(v) for k, v in data.items() if v is not None},
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(channel_id=ANDROID_CHANNEL),
        ),
        apns=messaging.APNSConfig(payload=messaging.APNSPayload(aps=messaging.Aps(sound="default"))),
    )


async def send_push(db, user_type: str, user_id: str, title: str, body: str,
                    link: Optional[str] = None, kind: Optional[str] = None) -> int:
    """Envoie le push aux appareils du compte ; renvoie le nombre d'envois réussis.
    Ne lève jamais : un push raté ne doit pas faire échouer l'action qui l'a déclenché."""
    try:
        if not is_firebase_initialized():
            return 0
        docs = await db.push_tokens.find({"userType": user_type, "userId": user_id}).to_list(MAX_TOKENS_PER_ACCOUNT)
        tokens = [d["token"] for d in docs]
        if not tokens:
            return 0
        message = build_message(tokens, title, body[:240], {"link": link, "type": kind})
        # Appel HTTP bloquant du SDK : hors de la boucle asyncio
        response = await asyncio.to_thread(messaging.send_each_for_multicast, message)
        dead = [tokens[i] for i, r in enumerate(response.responses) if not r.success and _is_dead(r.exception)]
        if dead:
            await db.push_tokens.delete_many({"token": {"$in": dead}})
        return response.success_count
    except Exception:
        logger.exception("Push non envoyé à %s %s", user_type, user_id)
        return 0


async def notify(db, notification: dict, background_tasks=None) -> None:
    """Enregistre une notification de la cloche (recipient_id, recipient_type,
    title, message, link, type) et l'envoie en push en tâche de fond."""
    await db.notifications.insert_one(notification)
    args = (db, notification["recipient_type"], notification["recipient_id"],
            notification["title"], notification["message"],
            notification.get("link"), notification.get("type"))
    if background_tasks is not None:
        background_tasks.add_task(send_push, *args)
    else:
        asyncio.get_running_loop().create_task(send_push(*args))
