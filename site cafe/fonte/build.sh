#!/bin/sh
# Gera os arquivos leves da raiz a partir dos originais legíveis desta pasta.
# Uso (precisa do Node): sh fonte/build.sh   — depois de editar algo aqui.
cd "$(dirname "$0")"
for f in script shop core dust qrcode magia; do npx --yes esbuild $f.js --minify --legal-comments=none --outfile=../$f.js --allow-overwrite; done
for f in style shop magia; do npx --yes esbuild $f.css --minify --outfile=../$f.css --allow-overwrite; done
