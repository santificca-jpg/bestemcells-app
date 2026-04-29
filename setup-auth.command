#!/bin/bash
# setup-auth.command
# Configuración inicial de autenticación segura con GitHub.
# Solo se corre UNA VEZ. Después usar sync.command para los pushes.

set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  Configuración de autenticación con GitHub"
echo "============================================"
echo ""

# 1. Configurar credential helper a osxkeychain
echo "[1/4] Configurando credential helper (osxkeychain)..."
git config --global credential.helper osxkeychain
echo "      OK"
echo ""

# 2. Limpiar tokens embebidos en el remote del proyecto, si quedaron
echo "[2/4] Verificando que no haya tokens en .git/config..."
if grep -qE "ghp_|ghs_|github_pat_" .git/config 2>/dev/null; then
    REPO_URL=$(git remote get-url origin | sed -E 's|https://[^@]+@|https://|')
    git remote set-url origin "$REPO_URL"
    echo "      Token removido. Remote ahora: $REPO_URL"
else
    echo "      OK, no hay tokens embebidos."
fi
echo ""

# 3. Instrucciones para el PAT
echo "[3/4] Necesitás un Personal Access Token (PAT) nuevo de GitHub:"
echo ""
echo "      a) Abrí https://github.com/settings/tokens"
echo "      b) REVOCÁ el token viejo (el que empieza con ghp_laGn...)"
echo "      c) Click 'Generate new token' -> 'Generate new token (classic)'"
echo "      d) Note: 'BeStemcells-app local'"
echo "      e) Expiration: 90 days (o lo que prefieras)"
echo "      f) Scope: marcá SOLO 'repo'"
echo "      g) Click 'Generate token' y COPIÁ el token (empieza con ghp_)"
echo ""
read -p "Cuando tengas el PAT copiado, presioná Enter para continuar..." _
echo ""

# 4. Probar push para que el llavero capture las credenciales
echo "[4/4] Probando conexión con GitHub..."
echo "      Te va a pedir credenciales:"
echo "        Username: santificca-jpg"
echo "        Password: pegá el PAT nuevo (no se ve mientras lo pegás, es normal)"
echo ""

# fetch fuerza auth en repo privado y guarda en keychain
if git fetch origin 2>&1; then
    echo ""
    echo "============================================"
    echo "  ✓ Listo. Auth configurada."
    echo "============================================"
    echo ""
    echo "De ahora en adelante:"
    echo "  - Doble click en sync.command para subir cambios"
    echo "  - No te va a pedir credenciales nunca más"
    echo ""
else
    echo ""
    echo "⚠️  El fetch falló. Posibles causas:"
    echo "   - PAT mal copiado"
    echo "   - PAT sin scope 'repo'"
    echo "   - Sin internet"
    echo ""
    echo "Volvé a correr este script cuando tengas el PAT correcto."
fi

echo ""
read -p "Presioná Enter para cerrar..." _
