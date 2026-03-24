#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# PLANER V2 — DEPLOY SCRIPT
# Servidor: Ubuntu 20 LTS
# Ruta en servidor: /usr/local/bin/planer-v2-deploy.sh
# Para ejecutar: sudo bash /usr/local/bin/planer-v2-deploy.sh
# =========================================================

# ============ CONFIG ============
REPO_DIR="/opt/apps/planer"
BACK_DIR="$REPO_DIR/v2sistema/v2backend"
FRONT_DIR="$REPO_DIR/v2sistema/v2frontend"
WEB_DIR="/var/www/planer-v2"
PM2_APP="planer-api-v2"
BRANCH="main"
NODE_ENV_PROD="production"
NGINX_CONF_DEST="/etc/nginx/sites-available/planer-v2"
# ================================

echo ""
echo "============================================="
echo "  PLANER V2 — INICIANDO DESPLIEGUE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================="
echo ""

# -------------------------------------------------
# (1) Actualizar repositorio
# -------------------------------------------------
echo "==> (1) Actualizando repositorio rama [$BRANCH]"
cd "$REPO_DIR"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git pull origin "$BRANCH"
echo "    Commit actual: $(git log --oneline -1)"

# -------------------------------------------------
# (2) Backend v2: Instalar y compilar
# -------------------------------------------------
echo ""
echo "==> (2) Backend v2: Instalando dependencias..."
cd "$BACK_DIR"

# Usar --legacy-peer-deps porque el proyecto tiene peer deps mixtos (GraphQL + tRPC)
npm install --legacy-peer-deps

echo "==> (2.1) Backend v2: Limpiando y Compilando..."
cd "$BACK_DIR"
rm -rf dist
npm run build

# Verificar que el build realmente creo el archivo
if [ ! -f "dist/main.js" ]; then
    echo "❌ ERROR: No se encontro dist/main.js despues del build."
    echo "   Intenta ejecutar 'npx nest build' manualmente en $BACK_DIR para ver el error."
    exit 1
fi

# -------------------------------------------------
# (3) Backend v2: Reiniciar con PM2
# -------------------------------------------------
echo ""
echo "==> (3) Backend v2: Reiniciando proceso PM2 [$PM2_APP]"

# Setear NODE_ENV antes de arrancar
export NODE_ENV="$NODE_ENV_PROD"

if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
    pm2 restart "$PM2_APP" --update-env
    echo "    Proceso reiniciado exitosamente."
else
    pm2 start dist/main.js \
        --name "$PM2_APP" \
        --env production \
        -e /var/log/planer-v2-error.log \
        -o /var/log/planer-v2-out.log
    echo "    Proceso creado y arrancado exitosamente."
fi

# Guardar estado de PM2 para que sobreviva reinicios del servidor
pm2 save

# -------------------------------------------------
# (4) Frontend v2: Build React + copiar a Nginx
# -------------------------------------------------
echo ""
echo "==> (4) Frontend v2: Procesando React PWA..."

if [ -d "$FRONT_DIR" ]; then
    cd "$FRONT_DIR"

    echo "    Instalando dependencias frontend..."
    npm install --legacy-peer-deps

    echo "    Compilando con NODE_ENV=production..."
    NODE_ENV="$NODE_ENV_PROD" npm run build

    echo "    Copiando build a $WEB_DIR..."
    sudo mkdir -p "$WEB_DIR"
    sudo rsync -av --delete dist/ "$WEB_DIR/"

    echo "    Ajustando permisos Nginx..."
    sudo chown -R www-data:www-data "$WEB_DIR"
    sudo chmod -R 755 "$WEB_DIR"

    echo "    Frontend v2 actualizado en $WEB_DIR"
else
    echo "    ADVERTENCIA: No se encontro el directorio $FRONT_DIR"
    exit 1
fi

# -------------------------------------------------
# (5) Copiar Nginx config si no existe
# -------------------------------------------------
echo ""
echo "==> (5) Verificando configuracion Nginx..."

NGINX_SOURCE="$FRONT_DIR/nginx.conf"

if [ ! -f "$NGINX_CONF_DEST" ]; then
    echo "    Copiando nginx.conf a sites-available..."
    sudo cp "$NGINX_SOURCE" "$NGINX_CONF_DEST"
    sudo ln -sf "$NGINX_CONF_DEST" /etc/nginx/sites-enabled/planer-v2
    echo "    Config creada. Verificando sintaxis Nginx..."
else
    echo "    Config Nginx ya existe (no se sobrescribe automaticamente)."
    echo "    Para actualizar manualmente: sudo cp $NGINX_SOURCE $NGINX_CONF_DEST"
fi

# Verificar config Nginx y recargar
sudo nginx -t && sudo systemctl reload nginx
echo "    Nginx recargado exitosamente."

# -------------------------------------------------
# (6) Reporte final
# -------------------------------------------------
echo ""
echo "============================================="
echo "  DESPLIEGUE V2 FINALIZADO CON EXITO"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================="
echo ""
echo "  Backend  -> PM2: $PM2_APP"
echo "  Frontend -> $WEB_DIR"
echo "  Logs     -> pm2 logs $PM2_APP"
echo ""
pm2 status "$PM2_APP"
