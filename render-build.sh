#!/usr/bin/env bash
# Garante que o script pare de ser executado se um comando falhar
set -o errexit

echo "➡️  Instalando dependências do projeto com npm..."
# Instala todas as dependências do package.json.
# Este comando AUTOMATICAMENTE executa o script de instalação do Puppeteer.
npm install

echo "🚀 Executando o script de build do projeto (se houver um)..."
# Executa o script "build" definido em seu package.json, útil para projetos com TypeScript, etc.
# A flag --if-present evita erros se o script "build" não existir.
npm run build --if-present

echo "✅ Build concluído com sucesso!"