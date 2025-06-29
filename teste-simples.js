// PASSO 3 - FORMULÁRIO COMPLETO + CHECKBOX ÉPICO + DOWNLOAD ARQUIVOS
// Integração completa: Pipefy → Download → VSCode → MBM

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Funções auxiliares (copiadas do seu código épico)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const preencherCampo = async (page, seletor, valor) => {
  if (!valor) return;
  
  try {
    await page.waitForSelector(seletor, { timeout: 5000 });
    await page.focus(seletor);
    await page.evaluate((sel) => document.querySelector(sel).value = '', seletor);
    await page.type(seletor, valor);
    console.log(`✓ Campo ${seletor} preenchido com: ${valor}`);
  } catch (error) {
    console.log(`✗ Erro ao preencher ${seletor}: ${error.message}`);
  }
};

const marcarCheckbox = async (page, seletor) => {
  try {
    await page.waitForSelector(seletor, { timeout: 5000 });
    const isChecked = await page.$eval(seletor, el => el.checked);
    if (!isChecked) {
      await page.click(seletor);
      console.log(`✓ Checkbox ${seletor} marcado`);
    }
  } catch (error) {
    console.log(`✗ Erro ao marcar checkbox ${seletor}: ${error.message}`);
  }
};

const aguardarElemento = async (page, seletor, timeout = 10000) => {
  try {
    await page.waitForSelector(seletor, { timeout });
    return true;
  } catch (error) {
    console.log(`Elemento ${seletor} não encontrado: ${error.message}`);
    return false;
  }
};

// 1. DADOS DO PIPEFY (substitua pelos dados reais)
const dadosPipefy = {
  "razao_social": "corretora de seguros 3c",
  "cnpj": "23.815.370/0001-82",
  "email_contato": "comercial@seguros3c.com.br",
  "nome_responsavel": "contato",
  "cpf_responsavel": "527.056.220-04",
  "data_nascimento": "1980-01-29",
  "email_responsavel": "mkt@seguros3c.com.br"
};

// 2. CONVERTER PARA FORMATO MBM COMPLETO
function converterParaMBM(pipefy) {
  console.log('🔄 Convertendo dados do Pipefy para MBM...');
  
  return {
    // Campos do Pipefy
    razaosocial: pipefy.razao_social,
    cnpj_form: pipefy.cnpj,
    email_contato: pipefy.email_contato,
    nome_assinatura_plataforma: pipefy.nome_responsavel,
    cpf_plataforma: pipefy.cpf_responsavel,
    data_nascimento: pipefy.data_nascimento,
    email_responsavel: pipefy.email_responsavel,
    
    // Campos obrigatórios MBM
    ja_contatado_mbm: 'Não',
    nome_contatou_mbm: '',
    simples_nacional: 'Sim',
    parentesco: 'Não',
    parentesco_sim: '',
    comochegou: 'Formulário online Pipefy',
    nome_plataforma: 'INOVA REPRESENTAÇÃO E GESTÃO',
    cnpj_plataforma: '34.476.027/0001-77',
    receber_mkt: false,
    
    // Campos que podem ficar vazios (por enquanto)
    susep_form: '123456789', // Campo obrigatório - valor padrão
    issqn: '123456',
    endereco: '',
    endereco_numero: '',
    endereco_complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep_form: '',
    fixo: '',
    celular: '',
    email_faturamento: pipefy.email_contato,
    email_financeiro: pipefy.email_contato
  };
}

// =================== FUNÇÕES DE DOWNLOAD ===================

// Baixar arquivo do Pipefy com pasta específica do cliente
async function baixarArquivoPipefy(url, nomeArquivo, pastaCliente) {
  return new Promise((resolve, reject) => {
    // Criar pasta específica do cliente
    if (!fs.existsSync(pastaCliente)) {
      fs.mkdirSync(pastaCliente, { recursive: true });
      console.log(`📁 Pasta criada: ${pastaCliente}`);
    }
    
    const caminhoArquivo = path.join(pastaCliente, nomeArquivo);
    const arquivo = fs.createWriteStream(caminhoArquivo);
    
    console.log(`📥 Baixando: ${nomeArquivo} para ${pastaCliente}...`);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(arquivo);
        arquivo.on('finish', () => {
          arquivo.close();
          console.log(`✅ Download concluído: ${nomeArquivo}`);
          
          const stats = fs.statSync(caminhoArquivo);
          console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
          
          resolve(caminhoArquivo);
        });
      } else {
        arquivo.close();
        fs.unlink(caminhoArquivo, () => {});
        reject(new Error(`Erro HTTP: ${response.statusCode}`));
      }
    }).on('error', (error) => {
      arquivo.close();
      fs.unlink(caminhoArquivo, () => {});
      reject(error);
    });
  });
}

// Processar todos os arquivos do Pipefy com pasta única
async function processarArquivosPipefy(dadosPipefy) {
  console.log('📎 Processando arquivos do Pipefy...');
  
  // Criar ID único para este cliente
  const cnpjLimpo = dadosPipefy.cnpj?.replace(/\D/g, '') || 'sem_cnpj';
  const timestamp = Date.now();
  const clienteId = `${cnpjLimpo}_${timestamp}`;
  const pastaCliente = path.join('./documentos', clienteId);
  
  console.log(`🆔 Cliente ID: ${clienteId}`);
  console.log(`📁 Pasta do cliente: ${pastaCliente}`);
  
  // Mapeamento flexível: campos do Pipefy → nomes de arquivo
  const mapeamentoArquivos = {
    // Variações possíveis do CNPJ
    'Anexo CNPJ': 'cnpj.pdf',
    'CNPJ': 'cnpj.pdf',
    'Cartão CNPJ': 'cnpj.pdf',
    
    // Variações do Contrato Social
    'Contrato Social': 'social.pdf',
    'Contrato': 'social.pdf',
    'Ato Constitutivo': 'social.pdf',
    
    // Variações do RG
    'RG': 'rg.pdf',
    'RG do Responsável': 'rg.pdf',
    'Identidade': 'rg.pdf',
    
    // Outros documentos
    'CPF': 'cpf.pdf',
    'Comprovante': 'conta.pdf',
    'Comprovante Bancário': 'conta.pdf',
    'Alvará': 'alvara.pdf',
    'SUSEP': 'susep.pdf'
  };
  
  const arquivosParaBaixar = [];
  
  // Procurar por qualquer campo que tenha URL
  for (const [campoOriginal, nomeArquivo] of Object.entries(mapeamentoArquivos)) {
    if (dadosPipefy[campoOriginal]) {
      arquivosParaBaixar.push({
        url: dadosPipefy[campoOriginal],
        nomeArquivo: nomeArquivo,
        campoOriginal: campoOriginal
      });
      console.log(`📋 Encontrado: ${campoOriginal} → ${nomeArquivo}`);
    }
  }
  
  // Debug: mostrar todos os campos do Pipefy
  console.log('🔍 Campos disponíveis no Pipefy:');
  Object.keys(dadosPipefy).forEach(campo => {
    const valor = dadosPipefy[campo];
    if (typeof valor === 'string' && valor.includes('http')) {
      console.log(`  📎 ${campo}: ${valor.substring(0, 50)}...`);
    } else {
      console.log(`  📝 ${campo}: ${valor}`);
    }
  });
  
  if (arquivosParaBaixar.length === 0) {
    console.log('⚠️ Nenhum arquivo para download encontrado');
    return { 
      arquivos: {}, 
      sucessos: 0, 
      falhas: 0, 
      pastaCliente: pastaCliente 
    };
  }
  
  // Baixar todos os arquivos na pasta específica do cliente
  const arquivosBaixados = {};
  let sucessos = 0;
  let falhas = 0;
  
  for (const item of arquivosParaBaixar) {
    try {
      const caminhoLocal = await baixarArquivoPipefy(item.url, item.nomeArquivo, pastaCliente);
      arquivosBaixados[item.nomeArquivo] = caminhoLocal;
      sucessos++;
    } catch (error) {
      console.log(`❌ Erro ao baixar ${item.campoOriginal}:`, error.message);
      falhas++;
    }
  }
  
  console.log(`📊 Downloads: ✅ ${sucessos} sucessos | ❌ ${falhas} falhas`);
  
  return {
    arquivos: arquivosBaixados,
    sucessos,
    falhas,
    pastaCliente: pastaCliente,
    clienteId: clienteId
  };
}

// 3. FUNÇÃO COMPLETA DE CADASTRO (baseada no seu código épico)
async function cadastrarNoMBM(dados, pastaArquivos) {
  let browser;

  try {
    console.log('🚀 Iniciando processo de cadastro COMPLETO...');
    
    browser = await puppeteer.launch({
      headless: false, // Para você ver funcionando
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('📄 Acessando formulário MBM...');
    await page.goto('https://mbmseguros.com.br/novo-corretor/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // ACEITAR COOKIES
    console.log('🍪 Verificando e aceitando cookies...');
    try {
      await delay(3000);
      
      const botaoEncontrado = await page.evaluate(() => {
        const botoes = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
        const botaoAceitar = botoes.find(botao => 
          botao.textContent && botao.textContent.toLowerCase().includes('aceitar') ||
          botao.value && botao.value.toLowerCase().includes('aceitar')
        );
        if (botaoAceitar) {
          botaoAceitar.click();
          return true;
        }
        return false;
      });
      
      if (botaoEncontrado) {
        console.log('✓ Cookies aceitos!');
        await delay(2000);
      }
    } catch (error) {
      console.log('🍪 Erro ao aceitar cookies:', error.message);
    }

    // =================== ETAPA 1 - DADOS ===================
    console.log('📝 Preenchendo ETAPA 1 - Dados...');
    await delay(3000);
    
    // Pergunta sobre contato MBM
    if (dados.ja_contatado_mbm) {
      try {
        console.log('🔧 Selecionando radio ja_contatado_mbm...');
        await page.waitForSelector('input[name="ja_contatado_mbm"]', { timeout: 10000 });
        await page.evaluate(() => {
          const elemento = document.querySelector('input[name="ja_contatado_mbm"]');
          if (elemento) elemento.scrollIntoView();
        });
        await delay(1000);
        
        const seletor = `input[name="ja_contatado_mbm"][value="${dados.ja_contatado_mbm}"]`;
        await page.evaluate((sel) => {
          const radio = document.querySelector(sel);
          if (radio) {
            radio.checked = true;
            radio.click();
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.dispatchEvent(new Event('click', { bubbles: true }));
          }
        }, seletor);
        
        const foiSelecionado = await page.$eval(seletor, el => el.checked);
        console.log(`✓ Radio ja_contatado_mbm ${foiSelecionado ? 'SELECIONADO' : 'FALHOU'}: ${dados.ja_contatado_mbm}`);
      } catch (error) {
        console.log(`✗ Erro ao selecionar radio ja_contatado_mbm: ${error.message}`);
      }
    }
    
    // Preenchimento de todos os campos
    await preencherCampo(page, 'input[name="nome_contatou_mbm"]', dados.nome_contatou_mbm);
    await preencherCampo(page, 'input[name="razaosocial"]', dados.razaosocial);
    await preencherCampo(page, 'input[name="cnpj_form"]', dados.cnpj_form);
    await preencherCampo(page, 'input[name="susep_form"]', dados.susep_form);

    // Simples Nacional
    if (dados.simples_nacional) {
      try {
        console.log('🔧 Selecionando radio simples_nacional...');
        await page.waitForSelector('input[name="simples_nacional"]', { timeout: 10000 });
        await delay(500);
        
        const seletor = `input[name="simples_nacional"][value="${dados.simples_nacional}"]`;
        await page.evaluate((sel) => {
          const radio = document.querySelector(sel);
          if (radio) {
            radio.checked = true;
            radio.click();
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.dispatchEvent(new Event('click', { bubbles: true }));
          }
        }, seletor);
        
        const foiSelecionado = await page.$eval(seletor, el => el.checked);
        console.log(`✓ Radio simples_nacional ${foiSelecionado ? 'SELECIONADO' : 'FALHOU'}: ${dados.simples_nacional}`);
      } catch (error) {
        console.log(`✗ Erro ao selecionar radio simples_nacional: ${error.message}`);
      }
    }

    // Resto dos campos
    await preencherCampo(page, 'input[name="issqn"]', dados.issqn);
    await preencherCampo(page, 'input[name="endereco"]', dados.endereco);
    await preencherCampo(page, 'input[name="endereco_numero"]', dados.endereco_numero);
    await preencherCampo(page, 'input[name="endereco_complemento"]', dados.endereco_complemento);
    await preencherCampo(page, 'input[name="bairro"]', dados.bairro);
    await preencherCampo(page, 'input[name="cidade"]', dados.cidade);
    await preencherCampo(page, 'input[name="uf"]', dados.uf);
    await preencherCampo(page, 'input[name="cep_form"]', dados.cep_form);
    await preencherCampo(page, 'input[name="fixo"]', dados.fixo);
    await preencherCampo(page, 'input[name="celular"]', dados.celular);
    await preencherCampo(page, 'input[name="email_contato"]', dados.email_contato);
    await preencherCampo(page, 'input[name="email_faturamento"]', dados.email_faturamento);
    await preencherCampo(page, 'input[name="email_financeiro"]', dados.email_financeiro);
    await preencherCampo(page, 'input[name="parentesco"]', dados.parentesco);
    await preencherCampo(page, 'input[name="parentesco_sim"]', dados.parentesco_sim);
    await preencherCampo(page, 'input[name="nome_assinatura_plataforma"]', dados.nome_assinatura_plataforma);
    await preencherCampo(page, 'input[name="cpf_plataforma"]', dados.cpf_plataforma);
    await preencherCampo(page, 'input[name="data_nascimento"]', dados.data_nascimento);
    await preencherCampo(page, 'input[name="e-mail_responsavel"]', dados.email_responsavel);

    // Como chegou ao MBM
    if (dados.comochegou) {
      try {
        await page.waitForSelector('textarea[name="comochegou"]', { timeout: 5000 });
        await page.focus('textarea[name="comochegou"]');
        await page.evaluate(() => document.querySelector('textarea[name="comochegou"]').value = '');
        await page.type('textarea[name="comochegou"]', dados.comochegou);
        console.log('✓ Campo "Como chegou" preenchido');
      } catch (error) {
        console.log('✗ Erro ao preencher campo "Como chegou"');
      }
    }

    await preencherCampo(page, 'input[name="nome_plataforma"]', dados.nome_plataforma);
    await preencherCampo(page, 'input[name="cnpj_plataforma"]', dados.cnpj_plataforma);

    // Checkbox marketing
    if (dados.receber_mkt) {
      await marcarCheckbox(page, 'input[name="receber_mkt[]"]');
    }
    
    // =================== CHECKBOX ÉPICO ===================
    console.log('🔧 Marcando checkboxes de aceite (VERSÃO ÉPICA)...');
    
    try {
      console.log('🔍 Investigando checkbox aceito2024 (wpcf7-acceptance)...');
      
      await page.waitForSelector('#aceito2024', { timeout: 10000 });
      
      // Scroll até a área dos checkboxes
      await page.evaluate(() => {
        const elemento = document.querySelector('.corretoraceite') || document.querySelector('#aceito2024');
        if (elemento) elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      
      await delay(2000);
      
      // Método 1: Click no checkbox
      console.log('🔧 Método 1: Click direto no checkbox...');
      let sucesso = await page.evaluate(() => {
        const checkbox = document.querySelector('#aceito2024');
        if (checkbox) {
          checkbox.click();
          return checkbox.checked;
        }
        return false;
      });
      console.log(`Método 1 resultado: ${sucesso ? 'SUCESSO' : 'FALHOU'}`);
      
      if (!sucesso) {
        // Método 2: Click no label (mais natural)
        console.log('🔧 Método 2: Click no label...');
        sucesso = await page.evaluate(() => {
          const checkbox = document.querySelector('#aceito2024');
          const label = checkbox?.closest('label');
          if (label) {
            label.click();
            return checkbox.checked;
          }
          return false;
        });
        console.log(`Método 2 resultado: ${sucesso ? 'SUCESSO' : 'FALHOU'}`);
      }
      
      if (!sucesso) {
        // Método 3: Força JavaScript + eventos WPCF7
        console.log('🔧 Método 3: JavaScript forçado + eventos WPCF7...');
        sucesso = await page.evaluate(() => {
          const checkbox = document.querySelector('#aceito2024');
          if (checkbox) {
            // Força o estado
            checkbox.checked = true;
            checkbox.setAttribute('checked', 'checked');
            
            // Dispara eventos específicos do Contact Form 7
            const eventos = ['change', 'click', 'input', 'wpcf7:validate'];
            eventos.forEach(evento => {
              checkbox.dispatchEvent(new Event(evento, { 
                bubbles: true, 
                cancelable: true 
              }));
            });
            
            // Também dispara no wrapper
            const wrapper = document.querySelector('.wpcf7-form-control-wrap[data-name="aceite"]');
            if (wrapper) {
              wrapper.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            return checkbox.checked;
          }
          return false;
        });
        console.log(`Método 3 resultado: ${sucesso ? 'SUCESSO' : 'FALHOU'}`);
      }
      
      if (!sucesso) {
        // Método 4: Simula interação humana
        console.log('🔧 Método 4: Simulação de interação humana...');
        try {
          await page.hover('#aceito2024');
          await delay(500);
          await page.click('#aceito2024', { delay: 100 });
          await delay(500);
          
          sucesso = await page.$eval('#aceito2024', el => el.checked);
          console.log(`Método 4 resultado: ${sucesso ? 'SUCESSO' : 'FALHOU'}`);
        } catch (error) {
          console.log('Método 4 erro:', error.message);
        }
      }
      
      // Verifica estado final
      const estadoFinal = await page.$eval('#aceito2024', el => el.checked);
      console.log(`📊 ESTADO FINAL checkbox aceito2024: ${estadoFinal ? '✅ MARCADO' : '❌ DESMARCADO'}`);
      
    } catch (error) {
      console.log('❌ Erro geral no checkbox aceito2024:', error.message);
    }

    console.log('✅ ETAPA 1 preenchida. Pronto para avançar!');
    console.log('💡 Pressione ENTER para tentar clicar em "Próximo"...');
    
    // Aguarda você ver o resultado
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // Tentar clicar no próximo
    try {
      await page.click('button.cf7mls_next');
      await delay(3000);
      console.log('✅ Clicou no botão "Próximo"!');
      
      // Verificar se chegou na etapa 2
      const etapa2Carregada = await aguardarElemento(page, 'input[name="cnpj_arquivo"]', 15000);
      if (etapa2Carregada) {
        console.log('🎉 SUCESSO! Chegou na ETAPA 2 - Upload de arquivos!');
        
        // =================== ETAPA 2 - UPLOAD DE ARQUIVOS ===================
        if (pastaArquivos) {
          console.log('📎 Iniciando ETAPA 2 - Upload de arquivos...');
          
          // Lista de arquivos para upload (usando a pasta específica do cliente)
          const arquivos = [
            { campo: 'input[name="cnpj_arquivo"]', arquivo: 'cnpj.pdf' },
            { campo: 'input[name="social"]', arquivo: 'social.pdf' },
            { campo: 'input[name="alvara"]', arquivo: 'alvara.pdf' },
            { campo: 'input[name="iss"]', arquivo: 'iss.pdf' },
            { campo: 'input[name="susep"]', arquivo: 'susep.pdf' },
            { campo: 'input[name="rg"]', arquivo: 'rg.pdf' },
            { campo: 'input[name="cpf_arquivo"]', arquivo: 'cpf.pdf' },
            { campo: 'input[name="conta"]', arquivo: 'conta.pdf' }
          ];

          let uploadsRealizados = 0;
          let uploadsFalharam = 0;
          
          for (const item of arquivos) {
            const caminhoCompleto = path.join(pastaArquivos, item.arquivo);
            
            // Verifica se o arquivo existe antes de tentar upload
            if (fs.existsSync(caminhoCompleto)) {
              console.log(`📎 Upload ${uploadsRealizados + 1}: ${item.arquivo}`);
              
              try {
                await page.waitForSelector(item.campo, { timeout: 5000 });
                const input = await page.$(item.campo);
                await input.uploadFile(caminhoCompleto);
                
                // Aguarda um pouco para o upload processar
                await delay(1000);
                console.log(`✅ Upload realizado: ${item.arquivo}`);
                uploadsRealizados++;
              } catch (error) {
                console.log(`❌ Erro no upload ${item.arquivo}:`, error.message);
                uploadsFalharam++;
              }
            } else {
              console.log(`⚠️  Arquivo não encontrado: ${item.arquivo}`);
              uploadsFalharam++;
            }
            
            await delay(1000);
          }
          
          console.log(`📊 Resumo dos uploads: ✅ ${uploadsRealizados} | ❌ ${uploadsFalharam}`);
          
          if (uploadsRealizados > 0) {
            console.log('💡 Pressione ENTER para tentar enviar o formulário...');
            await new Promise(resolve => {
              process.stdin.once('data', () => resolve());
            });
            
            // Tentar enviar formulário
            try {
              await page.click('input[type="submit"][value="Enviar"]');
              await delay(5000);
              console.log('📤 Formulário enviado!');
              
              // Verificar sucesso
              try {
                await page.waitForSelector('.wpcf7-response-output', { timeout: 15000 });
                const mensagem = await page.$eval('.wpcf7-response-output', el => el.textContent.trim());
                console.log('📨 Resposta do servidor:', mensagem);
                
                if (mensagem.toLowerCase().includes('agradecemos')) {
                  console.log('🎉 SUCESSO TOTAL! Cadastro realizado com sucesso!');
                } else {
                  console.log('⚠️  Resposta inesperada do servidor');
                }
              } catch (error) {
                console.log('⚠️  Não foi possível capturar mensagem de resposta');
              }
            } catch (error) {
              console.log('❌ Erro ao enviar formulário:', error.message);
            }
          } else {
            console.log('❌ Nenhum arquivo foi enviado, não é possível finalizar');
          }
        } else {
          console.log('⚠️  Sem arquivos para upload - etapa 2 pulada');
        }
      } else {
        console.log('⚠️  Não conseguiu carregar a ETAPA 2');
      }
    } catch (error) {
      console.log('❌ Erro ao clicar no próximo:', error.message);
    }

    console.log('💡 Pressione ENTER para fechar o navegador...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    return { sucesso: true, mensagem: 'Teste completo realizado!' };

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return { sucesso: false, erro: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 4. PROCESSAR COMPLETO
async function processar() {
  console.log('🚀 PASSO 3 - FORMULÁRIO COMPLETO INICIADO!');
  console.log('📨 Dados do Pipefy:', dadosPipefy);
  
  const dadosConvertidos = converterParaMBM(dadosPipefy);
  console.log('✅ Dados convertidos para MBM:', dadosConvertidos);
  
  console.log('🤖 Chamando cadastro completo...');
  const resultado = await cadastrarNoMBM(dadosConvertidos);
  
  console.log('📋 Resultado final:', resultado);
}

// 5. EXECUTAR
processar();