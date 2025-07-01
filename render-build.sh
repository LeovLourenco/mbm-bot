#!/usr/bin/env bash
set -o errexit

echo "➡️  Instalando dependências do projeto com npm..."
npm install

echo "➡️  Garantindo que o Chrome para o Puppeteer está instalado..."
npx @puppeteer/browsers install chrome

echo "🚀 Executando o script de build do projeto (se houver um)..."
npm run build --if-present

echo "✅ Build concluído com sucesso!"