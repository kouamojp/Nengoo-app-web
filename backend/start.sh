#!/bin/bash
# Script de démarrage pour Render

# Créer le dossier uploads s'il n'existe pas
mkdir -p uploads/products

# Démarrer le serveur FastAPI avec Uvicorn
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
