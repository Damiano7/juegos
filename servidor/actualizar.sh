#!/usr/bin/env bash
# Baja la última versión desde GitHub y reinicia el servidor online.
set -e
cd "$(dirname "$0")"
git pull
npm install --omit=dev --no-audit --no-fund
sudo systemctl restart heroes-online
echo "✔ Servidor actualizado y reiniciado"
