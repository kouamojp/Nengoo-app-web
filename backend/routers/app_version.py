"""
Versions de l'app mobile : mise à jour recommandée ou obligatoire.

L'app compare son numéro de build (le nombre après « + » dans
nengoo-front/pubspec.yaml, par ex. 1.0.3+21 → 21) aux réglages de sa
plateforme :
  - build < minBuild    : écran bloquant, seule action « Mettre à jour » ;
  - build < latestBuild : invitation à mettre à jour, avec « Plus tard ».

Réglé depuis l'admin (super administrateur), sans republier l'app. Ne monter
minBuild qu'une fois la nouvelle version en ligne dans le store : sinon les
utilisateurs sont bloqués sans mise à jour disponible.
"""
from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field, model_validator

from server import db, super_admin_required

router = APIRouter(tags=["app-version"])

SETTINGS_ID = "app_version"
PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=nengoo.com"


class PlatformVersion(BaseModel):
    minBuild: int = Field(0, ge=0, le=1_000_000)
    latestBuild: int = Field(0, ge=0, le=1_000_000)
    storeUrl: str = Field("", max_length=500)

    @model_validator(mode="after")
    def check(self):
        self.storeUrl = self.storeUrl.strip()
        if self.minBuild > self.latestBuild:
            raise ValueError("La version minimale ne peut pas dépasser la version recommandée.")
        if (self.minBuild or self.latestBuild) and not self.storeUrl.startswith("https://"):
            raise ValueError("Indiquez le lien https:// de l'app dans le store.")
        return self


class AppVersionSettings(BaseModel):
    android: PlatformVersion = PlatformVersion(storeUrl=PLAY_STORE_URL)
    ios: PlatformVersion = PlatformVersion()


async def load_settings() -> AppVersionSettings:
    doc = await db.settings.find_one({"_id": SETTINGS_ID}, {"_id": 0})
    return AppVersionSettings(**doc) if doc else AppVersionSettings()


@router.get("/app/version", response_model=AppVersionSettings)
async def get_app_version(response: Response):
    # Lu à chaque ouverture de l'app : court cache pour absorber les pointes
    response.headers["Cache-Control"] = "public, max-age=60"
    return await load_settings()


@router.put("/app/version", response_model=AppVersionSettings, dependencies=[Depends(super_admin_required)])
async def update_app_version(settings: AppVersionSettings):
    await db.settings.update_one({"_id": SETTINGS_ID}, {"$set": settings.model_dump()}, upsert=True)
    return settings
