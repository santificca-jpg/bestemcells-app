#!/bin/bash
# sync.command
# Sincroniza tus cambios con GitHub: add + commit + push.
# Doble click para correr.

cd "$(dirname "$0")"

echo "============================================"
echo "  Sync con GitHub"
echo "  Repo: $(git remote get-url origin 2>/dev/null)"
echo "  Rama: $(git branch --show-current 2>/dev/null)"
echo "============================================"
echo ""

# 0. Limpiar locks viejos si no hay git corriendo (evita el error "index.lock exists")
if [ -f .git/index.lock ] && ! pgrep -x git > /dev/null; then
    echo "[0/5] Lock viejo detectado, limpiando..."
    rm -f .git/index.lock
    rm -f .git/HEAD.lock 2>/dev/null
    rm -f .git/objects/maintenance.lock 2>/dev/null
    echo "      OK"
    echo ""
fi

# 1. Traer cambios remotos primero (evita conflictos)
echo "[1/5] Trayendo cambios remotos..."
if ! git pull --rebase --autostash 2>&1; then
    echo ""
    echo "⚠️  Error al traer cambios. Revisá si hay conflictos."
    read -p "Enter para cerrar..." _
    exit 1
fi
echo ""

# 2. Mostrar cambios locales
echo "[2/5] Cambios locales detectados:"
CHANGES=$(git status -s)
if [ -z "$CHANGES" ]; then
    echo "      (ninguno)"
    echo ""
    echo "============================================"
    echo "  ✓ Todo sincronizado, no hay nada que subir."
    echo "============================================"
    read -p "Enter para cerrar..." _
    exit 0
fi
echo "$CHANGES"
echo ""

# 3. Pedir mensaje de commit
echo "[3/5] Mensaje del commit:"
echo "      (descripción breve, ej: 'fix login bug', 'add nueva pagina contacto')"
echo ""
read -p "  > " MSG

if [ -z "$MSG" ]; then
    MSG="auto-sync $(date '+%Y-%m-%d %H:%M')"
    echo "      (vacío, uso por defecto: $MSG)"
fi
echo ""

# 4. Add + commit
echo "[4/5] Guardando cambios localmente..."
git add -A
if ! git commit -m "$MSG"; then
    echo "⚠️  No se pudo commitear."
    read -p "Enter para cerrar..." _
    exit 1
fi
echo ""

# 5. Push
echo "[5/5] Subiendo a GitHub..."
if git push 2>&1; then
    echo ""
    echo "============================================"
    echo "  ✓ Cambios sincronizados con GitHub"
    echo "  Mensaje: $MSG"
    echo "============================================"
else
    echo ""
    echo "⚠️  El push falló. Si pide credenciales, corré setup-auth.command primero."
fi

echo ""
read -p "Enter para cerrar..." _
