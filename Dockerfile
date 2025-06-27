FROM node:18-slim

# Instalar dependências do sistema para Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Instalar Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Configurar diretório de trabalho
WORKDIR /app

# Copiar apenas package.json primeiro
COPY package.json ./

# Instalar dependências (sem package-lock.json)
RUN npm install --omit=dev

# Copiar código da aplicação
COPY . .

# Criar pasta para documentos
RUN mkdir -p documentos

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]