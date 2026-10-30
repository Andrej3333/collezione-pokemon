#!/usr/bin/env bash
# Costruisce l'APK firmato dell'app Android. Gira su GitHub Actions.
set -euo pipefail

if [ -z "${ANDROID_FIRMA:-}" ]; then
  echo "Manca il segreto ANDROID_FIRMA: l'app non viene costruita finche non lo aggiungi."
  echo "esito=senza_segreto" >> "${GITHUB_OUTPUT:-/dev/null}"
  exit 0
fi

pip install -q pycryptodome cryptography
CHIAVE_FILE="$RUNNER_TEMP/chiave.p12"
CHIAVE_PASSWORD=$(python strumenti/chiave_android.py "$CHIAVE_FILE" 2> "$RUNNER_TEMP/impronta.txt")
echo "::add-mask::$CHIAVE_PASSWORD"
export CHIAVE_FILE CHIAVE_PASSWORD

cd app
npm ci
npm run build
npx cap sync android
cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon -q

APK="app/build/outputs/apk/release/app-release.apk"
cp "$APK" "$RUNNER_TEMP/collezione-pokemon.apk"
echo "esito=costruito" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "apk=$RUNNER_TEMP/collezione-pokemon.apk" >> "${GITHUB_OUTPUT:-/dev/null}"
