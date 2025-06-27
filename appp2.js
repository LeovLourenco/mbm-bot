process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const express = require('express');
const app = express();

console.log('🟢 Express carregado');
console.log('🟢 Iniciando configuração das rotas...');

// Configurações específicas para Railway
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy - essencial para Railway
app.set('trust proxy', true);

// Middleware de log
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} - IP: ${req.ip} - ${new Date().toISOString()}`);
  next();
});

// Health check routes
app.get('/', (req, res) => {
  console.log('📍 Rota / acessada');
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  console.log('📍 Rota /health acessada');
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'MBM Bot',
    port: process.env.PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/status', (req, res) => {
  console.log('📍 Rota /status acessada');
  res.status(200).send('API MBM-Bot está funcionando!');
});

// Endpoint principal - VERSÃO DE TESTE
app.post('/enviar', async (req, res) => {
  try {
    console.log('📨 Recebendo dados:', req.body);
    
    const { nome, email, telefone, estado, cidade } = req.body;
    
    // Validação básica
    if (!nome || !email || !telefone) {
      return res.status(400).json({ 
        erro: 'Dados obrigatórios: nome, email, telefone' 
      });
    }
    
    console.log('✅ Dados validados:', { nome, email, telefone, estado, cidade });
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 100));
    
    res.status(200).json({ 
      sucesso: true,
      mensagem: 'API funcionando - dados recebidos com sucesso!',
      dados: { nome, email, telefone, estado, cidade },
      timestamp: new Date().toISOString(),
      processedBy: 'Railway'
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Configuração do servidor - Railway specific
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

console.log('🔍 DEBUG - process.env.PORT:', process.env.PORT);
console.log('🔍 DEBUG - PORT final:', PORT);
console.log('🔍 DEBUG - HOST:', HOST);
console.log('🔍 DEBUG - typeof PORT:', typeof PORT);

// Criar servidor com configurações específicas
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Binding: ${HOST}:${PORT}`);
  console.log(`📋 Endpoints disponíveis:`);
  console.log(`   GET  / - Health check`);
  console.log(`   GET  /health - Status detalhado`);
  console.log(`   GET  /status - Status simples`);
  console.log(`   POST /enviar - Receber dados do corretor`);
  console.log(`✅ Servidor Railway otimizado iniciado com sucesso!`);
});

// Configurações do servidor
server.timeout = 30000; // 30 segundos
server.keepAliveTimeout = 30000;
server.headersTimeout = 31000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, fechando servidor gracefully...');
  server.close(() => {
    console.log('✅ Servidor fechado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, fechando servidor gracefully...');
  server.close(() => {
    console.log('✅ Servidor fechado');
    process.exit(0);
  });
  setInterval(() => {
  console.log('🟢 App ainda rodando em', new Date().toISOString());
}, 10000);

});