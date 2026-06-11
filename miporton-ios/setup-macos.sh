#!/usr/bin/env bash
# Ejecutar en Mac con Xcode y CocoaPods instalados.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> npm install"
npm install

echo "==> Capacitor sync iOS"
npx cap sync ios

echo "==> CocoaPods (si no esta instalado: sudo gem install cocoapods)"
(cd ios/App && pod install)

echo "==> Abrir Xcode"
npx cap open ios

echo ""
echo "Listo. En Xcode: selecciona tu iPhone o simulador y pulsa Run."
echo "La app carga https://mivisita.app/login (no empaqueta el build Next.js)."
