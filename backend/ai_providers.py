"""
Fournisseurs d'IA de l'assistant Nengoo et choix du modèle selon le besoin.

Les quatre fournisseurs parlent le même protocole (POST /chat/completions) :
en ajouter un revient à ajouter une ligne à PROVIDERS. Les clés restent sur le
serveur ; le client ne choisit jamais le fournisseur.

Variables d'environnement (voir docs/ASSISTANT_IA.md) :
- AI_PROVIDER : fournisseur par défaut (kimi, deepseek, openai, gemini) ;
- AI_PROVIDER_SEARCH / _ADVICE / _COMPARE / _SUPPORT : fournisseur d'un besoin ;
- AI_FALLBACK_PROVIDERS : suite de secours, séparée par des virgules ;
- <NOM>_API_KEY : clé du fournisseur (sans clé, il est ignoré) ;
- <NOM>_MODEL, <NOM>_BASE_URL, <NOM>_PRICE_INPUT, <NOM>_PRICE_OUTPUT : réglages
  facultatifs ; les prix sont en dollars pour un million de jetons ;
- <NOM>_VISION : true ou false, le modèle lit-il les photos (recherche par image) ;
- <NOM>_REASONING_EFFORT : effort de réflexion envoyé au modèle (ex. low). Kimi k3
  réfléchit en effort max par défaut, trop lent pour les délais de l'assistant.
"""
import logging
import os
from dataclasses import dataclass
from typing import List, Optional

import requests

logger = logging.getLogger(__name__)

# « image » : le client a joint une photo, seuls les modèles qui lisent les images conviennent
NEEDS = ("search", "advice", "compare", "support", "image")


@dataclass(frozen=True)
class Provider:
    name: str
    base_url: str
    model: str
    # Dollars pour un million de jetons, relevés le 6 novembre 2026
    input_price: float
    output_price: float
    # Les modèles récents d'OpenAI refusent max_tokens
    token_param: str = "max_tokens"
    # Lit les images envoyées au format image_url (recherche par photo)
    vision: bool = False


PROVIDERS = {
    "deepseek": Provider("deepseek", "https://api.deepseek.com", "deepseek-flash", 0.30, 1.20),
    "kimi": Provider("kimi", "https://api.moonshot.ai/v1", "kimi-k3", 3.00, 15.00, vision=True),
    "openai": Provider("openai", "https://api.openai.com/v1", "gpt-5-nano", 0.05, 0.40,
                       token_param="max_completion_tokens", vision=True),
    "gemini": Provider("gemini", "https://generativelanguage.googleapis.com/v1beta/openai",
                       "gemini-3.1-flash-lite", 0.25, 1.50, vision=True),
}


class ProviderError(Exception):
    """Le fournisseur n'a pas pu répondre : on passe au suivant."""


@dataclass
class Completion:
    # Message brut, renvoyé tel quel au tour suivant : DeepSeek et Gemini y
    # placent des champs à réexpédier (reasoning_content, signatures)
    message: dict
    input_tokens: int
    output_tokens: int


def _env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env(name))
    except ValueError:
        return default


def api_key(provider: Provider) -> str:
    return _env(f"{provider.name.upper()}_API_KEY")


def model_of(provider: Provider) -> str:
    return _env(f"{provider.name.upper()}_MODEL") or provider.model


def reasoning_effort(provider: Provider) -> str:
    """Effort de réflexion demandé ; vide, le modèle garde le sien."""
    return _env(f"{provider.name.upper()}_REASONING_EFFORT").lower()


def reads_images(provider: Provider) -> bool:
    """Le modèle accepte-t-il une photo ? <NOM>_VISION l'emporte (changement de modèle)."""
    setting = _env(f"{provider.name.upper()}_VISION").lower()
    if setting in ("true", "1", "yes", "oui"):
        return True
    if setting in ("false", "0", "no", "non"):
        return False
    return provider.vision


def cost_usd(provider: Provider, input_tokens: int, output_tokens: int) -> float:
    """Coût d'un appel. Majorant : les remises sur jetons en cache sont ignorées."""
    prefix = provider.name.upper()
    input_price = _env_float(f"{prefix}_PRICE_INPUT", provider.input_price)
    output_price = _env_float(f"{prefix}_PRICE_OUTPUT", provider.output_price)
    return (input_tokens * input_price + output_tokens * output_price) / 1_000_000


def chain_for(need: str) -> List[Provider]:
    """Fournisseurs à essayer pour un besoin, dans l'ordre : celui du besoin,
    celui par défaut, puis les secours. Sans aucun réglage, tous ceux qui ont une clé.
    Pour une photo, seuls ceux qui lisent les images."""
    wanted = [_env(f"AI_PROVIDER_{need.upper()}"), _env("AI_PROVIDER")]
    wanted += _env("AI_FALLBACK_PROVIDERS").split(",")
    names = [n.strip().lower() for n in wanted if n.strip()] or list(PROVIDERS)
    chain: List[Provider] = []
    for name in dict.fromkeys(names):
        provider = PROVIDERS.get(name)
        if provider is None:
            logger.warning("Assistant : fournisseur inconnu « %s » ignoré", name)
        elif api_key(provider) and (need != "image" or reads_images(provider)):
            chain.append(provider)
    return chain


def complete(provider: Provider, messages: List[dict], tools: Optional[List[dict]], *,
             force_text: bool, max_tokens: int, timeout: float) -> Completion:
    """Un appel au modèle (bloquant : à lancer dans un thread)."""
    payload = {"model": model_of(provider), "messages": messages, provider.token_param: max_tokens}
    effort = reasoning_effort(provider)
    if effort:
        payload["reasoning_effort"] = effort
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "none" if force_text else "auto"
    base_url = (_env(f"{provider.name.upper()}_BASE_URL") or provider.base_url).rstrip("/")
    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key(provider)}"},
            timeout=timeout,
        )
    except requests.RequestException as error:
        # type(error) seulement : le message d'erreur peut citer l'URL complète
        raise ProviderError(f"{provider.name} injoignable ({type(error).__name__})") from None
    if response.status_code >= 400:
        raise ProviderError(f"{provider.name} : HTTP {response.status_code} {response.text[:200]}")
    try:
        data = response.json()
        message = data["choices"][0]["message"]
    except (ValueError, KeyError, IndexError, TypeError):
        raise ProviderError(f"{provider.name} : réponse illisible") from None
    usage = data.get("usage") or {}
    return Completion(
        message={k: v for k, v in message.items() if v is not None},
        input_tokens=int(usage.get("prompt_tokens") or 0),
        output_tokens=int(usage.get("completion_tokens") or 0),
    )
