#!/usr/bin/env bash
# Installer Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Mettre à jour pip
pip install --upgrade pip

# Installer les dépendances
pip install -r backend/requirements.txt
