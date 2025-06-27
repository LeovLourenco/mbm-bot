# Usa uma imagem Node.js leve para reduzir o tamanho final da imagem.
# 'alpine' é ainda menor que 'slim', mas 'slim' já é uma boa escolha.
FROM node:18-slim

# Define o diretório de trabalho dentro do contêiner.
WORKDIR /app

# Copia o package.json e o package-lock.json (se existir) para instalar as dependências primeiro.
# Isso aproveita o cache do Docker e acelera builds futuros se as dependências não mudarem.
COPY package.json ./

# Instala as dependências do projeto.
# '--omit=dev' garante que apenas as dependências de produção sejam instaladas, reduzindo o tamanho.
# '--verbose' é útil para debug, mas pode ser removido em produção.
RUN npm install --omit=dev

# Copia o restante do código da sua aplicação para o diretório de trabalho.
COPY . .

# Cria a pasta 'documentos'. (Se essa pasta for para upload de arquivos,
# considere que contêineres são efêmeros. Você pode precisar de armazenamento persistente para isso.)
RUN mkdir -p documentos

# Expõe a porta em que a aplicação Node.js vai escutar.
# Isso informa ao Docker que esta porta é relevante, mas não a publica automaticamente.
EXPOSE 3000

# Define o comando que será executado quando o contêiner iniciar.
# Usa o script 'start' definido no seu package.json.
CMD ["npm", "start"]
