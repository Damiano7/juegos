#!/usr/bin/env bash
# Instala el servidor online de "Héroes en Combate" en una VPS Ubuntu/Debian (por ejemplo, Oracle gratis).
# Uso:   bash instalar.sh server.delegacionesbahia.com
# Se puede correr de nuevo sin problema (por ejemplo, después de actualizar).
set -euo pipefail

DOMAIN="${1:-}"
PORT="${PORT:-8787}"
SERVICE="heroes-online"
DIR="$(cd "$(dirname "$0")" && pwd)"

ok()   { echo -e "\e[32m✔ $*\e[0m"; }
info() { echo -e "\e[36m→ $*\e[0m"; }
warn() { echo -e "\e[33m⚠ $*\e[0m"; }
fail() { echo -e "\e[31m✘ $*\e[0m"; exit 1; }

[ -n "$DOMAIN" ] || fail "Falta el dominio. Uso: bash instalar.sh server.delegacionesbahia.com"
command -v apt-get >/dev/null || fail "Este instalador es para Ubuntu/Debian. Avisame qué sistema tiene la VPS."

# ---------- 1. Node.js ----------
NEED_NODE=1
if command -v node >/dev/null; then
  MAJOR=$(node -v | sed 's/^v\([0-9]*\).*/\1/')
  [ "$MAJOR" -ge 18 ] && NEED_NODE=0
fi
if [ "$NEED_NODE" = 1 ]; then
  info "Instalando Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
ok "Node.js $(node -v)"

# ---------- 2. Dependencias del servidor ----------
info "Instalando dependencias..."
cd "$DIR"
npm install --omit=dev --no-audit --no-fund
ok "Dependencias listas"

# ---------- 3. Servicio que arranca solo ----------
if ss -ltn | grep -q "127.0.0.1:$PORT " && ! systemctl is-active --quiet "$SERVICE"; then
  fail "El puerto $PORT ya lo usa otro programa. Corré: PORT=8788 bash instalar.sh $DOMAIN"
fi
info "Creando el servicio $SERVICE..."
sudo tee /etc/systemd/system/$SERVICE.service >/dev/null <<EOF
[Unit]
Description=Servidor online de Héroes en Combate
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DIR
Environment=PORT=$PORT
ExecStart=$(command -v node) $DIR/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE" >/dev/null 2>&1
sudo systemctl restart "$SERVICE"
sleep 1
curl -fs "http://127.0.0.1:$PORT" >/dev/null && ok "Servidor del juego andando en el puerto $PORT" || fail "El servidor no arrancó. Mirá: sudo journalctl -u $SERVICE -n 50"

# ---------- 4. Firewall de la VPS (puertos 80 y 443) ----------
info "Abriendo los puertos 80 y 443 en el firewall de la VPS..."
for P in 80 443; do
  sudo iptables -C INPUT -p tcp --dport $P -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport $P -j ACCEPT
done
if command -v netfilter-persistent >/dev/null; then
  sudo netfilter-persistent save >/dev/null 2>&1 && ok "Reglas guardadas"
else
  echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
  echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null
  sudo netfilter-persistent save >/dev/null 2>&1 && ok "Reglas guardadas"
fi
if command -v ufw >/dev/null && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 80/tcp >/dev/null; sudo ufw allow 443/tcp >/dev/null
fi

# ---------- 5. HTTPS (el juego usa https, así que el servidor también) ----------
WHO443=$(sudo ss -ltnp | grep -E ':443 ' | head -n1 || true)
if echo "$WHO443" | grep -q nginx; then
  info "Ya tenés nginx en el puerto 443: agrego un sitio para $DOMAIN..."
  sudo tee /etc/nginx/sites-available/$SERVICE >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_read_timeout 3600s;
    }
}
EOF
  sudo ln -sf /etc/nginx/sites-available/$SERVICE /etc/nginx/sites-enabled/$SERVICE
  sudo nginx -t && sudo systemctl reload nginx
  sudo apt-get install -y certbot python3-certbot-nginx >/dev/null
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || warn "No se pudo sacar el certificado todavía. Si el DNS recién lo cambiaste, esperá unos minutos y corré este script de nuevo."
elif [ -z "$WHO443" ] || echo "$WHO443" | grep -q caddy; then
  if ! command -v caddy >/dev/null; then
    info "Instalando Caddy (se encarga del HTTPS solo)..."
    sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
    sudo apt-get update >/dev/null
    sudo apt-get install -y caddy >/dev/null
  fi
  CF=/etc/caddy/Caddyfile
  if [ ! -f "$CF" ] || grep -q "/usr/share/caddy" "$CF"; then
    # Caddyfile de ejemplo: lo reemplazamos
    echo "" | sudo tee "$CF" >/dev/null
  fi
  if ! grep -q "^$DOMAIN" "$CF"; then
    printf '\n%s {\n    reverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$PORT" | sudo tee -a "$CF" >/dev/null
  fi
  sudo systemctl enable caddy >/dev/null 2>&1
  sudo systemctl reload caddy 2>/dev/null || sudo systemctl restart caddy
  ok "Caddy configurado para https://$DOMAIN"
else
  warn "El puerto 443 ya lo usa otro programa:"
  echo "    $WHO443"
  warn "No lo toqué. Avisame qué programa es y te digo cómo sumar el servidor del juego."
  exit 1
fi

# ---------- 6. Prueba final ----------
info "Probando https://$DOMAIN ... (puede tardar un minuto la primera vez)"
for i in $(seq 1 20); do
  if curl -fs "https://$DOMAIN" >/dev/null 2>&1; then
    ok "¡Listo! https://$DOMAIN responde. El modo ONLINE ya debería funcionar."
    exit 0
  fi
  sleep 4
done
warn "Todavía no responde https://$DOMAIN."
echo "   Revisá: 1) que el registro DNS apunte a la IP de esta VPS,"
echo "           2) que en Oracle (Security List) estén abiertos los puertos 80 y 443,"
echo "           3) después corré este script de nuevo."
