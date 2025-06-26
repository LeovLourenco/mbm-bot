// teste-bot.js
const axios = require('axios');

// Configuração do servidor
const BASE_URL = 'http://localhost:3000';

// Dados de teste
const dadosTeste = {
  // Dados obrigatórios
  razaosocial: "Corretora Teste Automatizada Ltda",
  cnpj_form: "12.345.678/0001-90",
  susep_form: "123456789",
  email_contato: "teste@corretorateste.com.br",
  nome_assinatura_plataforma: "João Teste Silva",
  cpf_plataforma: "123.456.789-00",
  data_nascimento: "01/01/1980",
  email_responsavel: "joao@corretorateste.com.br",
  comochegou: "Teste automatizado do sistema",
  
  // Dados opcionais
  ja_contatado_mbm: "Não",
  simples_nacional: "Sim",
  endereco: "Rua Teste",
  endereco_numero: "123",
  bairro: "Centro",
  cidade: "Porto Alegre",
  uf: "RS",
  cep_form: "90000-000",
  celular: "(51) 99999-8888",
  
  // Plataforma (opcional)
  nome_plataforma: "Plataforma Teste",
  cnpj_plataforma: "98.765.432/0001-10",
  
  // Aceites
  receber_mkt: true
};

// Função para testar status do servidor
async function testarStatus() {
  try {
    console.log('🔍 Testando status do servidor...');
    const response = await axios.get(`${BASE_URL}/status`);
    console.log('✅ Servidor online:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Servidor offline:', error.message);
    return false;
  }
}

// Função para enviar cadastro
async function enviarCadastro(dados) {
  try {
    console.log('📤 Enviando cadastro de corretor...');
    console.log('📋 Dados:', JSON.stringify(dados, null, 2));
    
    const response = await axios.post(`${BASE_URL}/enviar`, dados, {
      timeout: 120000 // 2 minutos de timeout
    });
    
    console.log('✅ Cadastro enviado com sucesso!');
    console.log('📨 Resposta:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao enviar cadastro:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
    return null;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando teste do bot de cadastro de corretor');
  console.log('=' * 50);
  
  // Testa status
  const serverOnline = await testarStatus();
  if (!serverOnline) {
    console.log('❌ Servidor não está rodando. Execute: node app.js');
    return;
  }
  
  console.log('\n' + '=' * 50);
  
  // Envia cadastro
  const resultado = await enviarCadastro(dadosTeste);
  
  if (resultado) {
    console.log('\n✅ Teste concluído com sucesso!');
  } else {
    console.log('\n❌ Teste falhou!');
  }
}

// Executa se for chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testarStatus,
  enviarCadastro,
  dadosTeste
};