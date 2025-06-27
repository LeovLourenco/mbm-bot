const express = require('express');
const app = express();
// const puppeteer = require('puppeteer-core');  // ← COMENTADO PARA TESTE
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Debug logs
console.log('🟢 Express carregado');
console.log('🟢 Iniciando configuração das rotas...');

app.use(express.json());

// Health check routes
app.get('/', (req, res) => {
  console.log('📍 Rota / acessada');
  res.send('OK');
});

app.get('/health', (req, res) => {
  console.log('📍 Rota /health acessada');
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'MBM Bot'
  });
});

app.get('/status', (req, res) => {
  console.log('📍 Rota /status acessada');
  res.send('API MBM-Bot está funcionando!');
});

// Endpoint principal - VERSÃO DE TESTE SEM PUPPETEER
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
    
    // SIMULAÇÃO - sem puppeteer
    console.log('✅ Dados validados:', { nome, email, telefone, estado, cidade });
    
    res.json({ 
      sucesso: true,
      mensagem: 'API funcionando - dados recebidos com sucesso!',
      dados: { nome, email, telefone, estado, cidade },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: error.message
    });
  }
});

// Configuração do servidor
const PORT = process.env.PORT || 3000;

console.log('🔍 DEBUG - process.env.PORT:', process.env.PORT);
console.log('🔍 DEBUG - PORT final:', PORT);
console.log('🔍 DEBUG - typeof PORT:', typeof PORT);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
  console.log(`📋 Endpoints disponíveis:`);
  console.log(`   GET  / - Health check`);
  console.log(`   GET  /health - Status detalhado`);
  console.log(`   GET  /status - Status simples`);
  console.log(`   POST /enviar - Receber dados do corretor`);
});