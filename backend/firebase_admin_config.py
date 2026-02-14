import firebase_admin
from firebase_admin import credentials, auth
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Global flag to track initialization
_firebase_initialized = False

def initialize_firebase_admin():
    """
    Initialize Firebase Admin SDK
    Should be called once at application startup
    """
    global _firebase_initialized

    if _firebase_initialized:
        logger.info("Firebase Admin SDK already initialized")
        return

    try:
        # Path to Firebase service account JSON
        # Set FIREBASE_SERVICE_ACCOUNT_PATH in .env or use default
        service_account_path = os.getenv(
            'FIREBASE_SERVICE_ACCOUNT_PATH',
            str(Path(__file__).parent / 'firebase-service-account.json')
        )

        # Check if service account file exists
        if not os.path.exists(service_account_path):
            logger.warning(
                f"⚠️  Firebase service account file not found at: {service_account_path}\n"
                f"OAuth authentication will not work until you:\n"
                f"1. Download the service account JSON from Firebase Console\n"
                f"2. Place it at: {service_account_path}\n"
                f"3. Restart the server"
            )
            return

        # Initialize Firebase Admin with service account
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)

        _firebase_initialized = True
        logger.info("✅ Firebase Admin SDK initialized successfully")

    except Exception as e:
        logger.error(f"❌ Failed to initialize Firebase Admin SDK: {e}")
        logger.warning("OAuth authentication will not be available")


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded claims

    Args:
        id_token (str): Firebase ID token from client

    Returns:
        dict: Decoded token containing user information

    Raises:
        ValueError: If Firebase is not initialized
        Exception: If token verification fails
    """
    if not _firebase_initialized:
        raise ValueError(
            "Firebase Admin SDK is not initialized. "
            "Please ensure firebase-service-account.json is present and restart the server."
        )

    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(id_token)

        logger.info(f"✅ Token verified for user: {decoded_token.get('uid')}")

        return decoded_token

    except auth.InvalidIdTokenError as e:
        logger.error(f"❌ Invalid Firebase ID token: {e}")
        raise Exception("Invalid authentication token")

    except auth.ExpiredIdTokenError as e:
        logger.error(f"❌ Expired Firebase ID token: {e}")
        raise Exception("Authentication token has expired")

    except Exception as e:
        logger.error(f"❌ Token verification failed: {e}")
        raise Exception(f"Token verification failed: {str(e)}")


def get_user_by_uid(uid: str) -> dict:
    """
    Get user information from Firebase by UID

    Args:
        uid (str): Firebase user UID

    Returns:
        dict: User information
    """
    if not _firebase_initialized:
        raise ValueError("Firebase Admin SDK is not initialized")

    try:
        user = auth.get_user(uid)
        return {
            'uid': user.uid,
            'email': user.email,
            'display_name': user.display_name,
            'photo_url': user.photo_url,
            'email_verified': user.email_verified,
            'provider_id': user.provider_data[0].provider_id if user.provider_data else None,
        }
    except Exception as e:
        logger.error(f"❌ Failed to get user by UID: {e}")
        raise Exception(f"Failed to get user information: {str(e)}")


def is_firebase_initialized() -> bool:
    """
    Check if Firebase Admin SDK is initialized

    Returns:
        bool: True if initialized, False otherwise
    """
    return _firebase_initialized
