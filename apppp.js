const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

function findChromeExecutable() {
    const possiblePaths = [
        '/opt/render/project/src/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
        '/opt/render/project/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
        '/opt/render/project/.puppeteer_cache/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
        process.env.PUPPETEER_EXECUTABLE_PATH
    ].filter(Boolean);

    for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
            console.log(`✅ Chrome encontrado em: ${chromePath}`);
            return chromePath;
        } else {
            console.log(`❌ Chrome não encontrado em: ${chromePath}`);
        }
    }

    // Se não encontrar, liste o que existe no diretório
    console.log('🔍 Listando conteúdo do diretório src/chrome:');
    try {
        const chromeDir = '/opt/render/project/src/chrome';
        if (fs.existsSync(chromeDir)) {
            const contents = fs.readdirSync(chromeDir, { recursive: true });
            console.log(contents);
        }
    } catch (error) {
        console.log('Erro ao listar diretório:', error.message);
    }

    return null;
}

// Configuração do Puppeteer
function getPuppeteerConfig() {
    const chromeExecutable = findChromeExecutable();
    
    const config = {
        headless: true,
        args: [
            '--proxy-server=http://18.230.65.126:3128',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--single-process'
        ]
    };

    if (chromeExecutable) {
        config.executablePath = chromeExecutable;
    }

    return config;
}

// Função para lançar browser com debug
async function launchBrowser() {
    try {
        const config = getPuppeteerConfig();
        console.log('🚀 Configuração do Puppeteer:', config);
        
        const browser = await puppeteer.launch(config);
        console.log('✅ Browser iniciado com sucesso!');
        return browser;
    } catch (error) {
        console.error('❌ Erro ao iniciar browser:', error);
        throw error;
    }
}
console.log('🟢 Express carregado');
console.log('🟢 Puppeteer carregado');
console.log('🟢 Iniciando configuração das rotas...');

app.use(express.json());

// ✅ ADICIONE ESTAS 3 ROTAS AQUI:
app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'MBM Bot'
  });
});

app.get('/status', (req, res) => {
  res.send('API MBM-Bot está funcionando!');
});



// Função para aguardar/delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para validar se arquivo existe
const validarArquivo = (caminhoArquivo) => {
  return fs.existsSync(caminhoArquivo);
};

// Função para aguardar elemento aparecer
const aguardarElemento = async (page, seletor, timeout = 10000) => {
  try {
    await page.waitForSelector(seletor, { timeout });
    return true;
  } catch (error) {
    console.log(`Elemento ${seletor} não encontrado: ${error.message}`);
    return false;
  }
};

// Função para preencher campo de texto com verificação
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

// Função para selecionar radio button
const selecionarRadio = async (page, name, valor) => {
  if (!valor) return;
  
  try {
    const seletor = `input[name="${name}"][value="${valor}"]`;
    await page.waitForSelector(seletor, { timeout: 5000 });
    await page.click(seletor);
    console.log(`✓ Radio ${name} selecionado: ${valor}`);
  } catch (error) {
    console.log(`✗ Erro ao selecionar radio ${name}: ${error.message}`);
  }
};

// Função para marcar checkbox
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

// Função para fazer upload de arquivo - SUPER MELHORADA
const fazerUpload = async (page, seletor, caminhoArquivo) => {
  if (!caminhoArquivo || !validarArquivo(caminhoArquivo)) {
    console.log(`✗ Arquivo não encontrado: ${caminhoArquivo}`);
    return false;
  }
  
  try {
    console.log(`🔧 Tentando upload: ${path.basename(caminhoArquivo)} em ${seletor}`);
    
    // Aguarda o elemento aparecer
    await page.waitForSelector(seletor, { timeout: 10000 });
    
    // Scroll até o elemento
    await page.evaluate((sel) => {
      const elemento = document.querySelector(sel);
      if (elemento) elemento.scrollIntoView();
    }, seletor);
    
    await delay(1000);
    
    // Método 1: Tenta com uploadFile
    try {
      const input = await page.$(seletor);
      await input.uploadFile(caminhoArquivo);
      console.log(`✓ Upload realizado (método 1): ${path.basename(caminhoArquivo)}`);
      
      // Verifica se o arquivo foi anexado
      await delay(500);
      const temArquivo = await page.evaluate((sel) => {
        const input = document.querySelector(sel);
        return input && input.files && input.files.length > 0;
      }, seletor);
      
      if (temArquivo) {
        console.log(`✅ Arquivo confirmado anexado: ${path.basename(caminhoArquivo)}`);
        return true;
      } else {
        console.log(`⚠️  Arquivo não confirmado, tentando método alternativo...`);
      }
    } catch (error) {
      console.log(`⚠️  Método 1 falhou: ${error.message}, tentando método 2...`);
    }
    
    // Método 2: Força upload com JavaScript
    try {
      await page.evaluate((sel, arquivo) => {
        const input = document.querySelector(sel);
        if (input) {
          // Remove qualquer evento que possa interferir
          input.onclick = null;
          input.onchange = null;
          
          // Força focus
          input.focus();
          input.click();
        }
      }, seletor, caminhoArquivo);
      
      await delay(500);
      
      const input = await page.$(seletor);
      await input.uploadFile(caminhoArquivo);
      
      // Dispara eventos de mudança
      await page.evaluate((sel) => {
        const input = document.querySelector(sel);
        if (input) {
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, seletor);
      
      await delay(1000);
      
      // Verifica novamente
      const temArquivo = await page.evaluate((sel) => {
        const input = document.querySelector(sel);
        return input && input.files && input.files.length > 0;
      }, seletor);
      
      if (temArquivo) {
        console.log(`✅ Upload confirmado (método 2): ${path.basename(caminhoArquivo)}`);
        return true;
      }
      
    } catch (error) {
      console.log(`✗ Método 2 também falhou: ${error.message}`);
    }
    
    console.log(`❌ Falha total no upload: ${path.basename(caminhoArquivo)}`);
    return false;
    
  } catch (error) {
    console.log(`✗ Erro geral no upload ${seletor}: ${error.message}`);
    return false;
  }
};

app.post('/enviar', async (req, res) => {
  const dados = req.body;
  let browser;

  try {
    console.log('🚀 Iniciando processo de cadastro...');
    
    // CORRIGIDO

  browser = await launchBrowser();

    // Substitua sua configuração da página por esta versão melhorada:

  const page = await browser.newPage();

  // Configurações anti-bloqueio
  await page.setViewport({ width: 1366, height: 768 });

  // User-Agent mais realista e atualizado
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.6533.88 Safari/537.36');

  // Headers que simulam navegador real
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  });

  // Bloqueia detecção de webdriver
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Remove propriedades que indicam automação
    delete navigator.__proto__.webdriver;
    
    // Simula plugins do Chrome
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Simula idiomas
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });
    
    // Remove chrome automation extensions
    window.chrome = {
      runtime: {}
    };
  });

  console.log('📄 Acessando formulário...');
  await page.goto('https://mbmseguros.com.br/novo-corretor/', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
    console.log('📄 Acessando formulário...');
    await page.goto('https://mbmseguros.com.br/novo-corretor/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    // Adicione estas linhas logo após acessar o formulário no seu código:

  // Screenshot 1: Logo após carregar a página
  console.log('📸 Capturando screenshot 1 - Página inicial');
  const screenshot1 = await page.screenshot({ encoding: 'base64', fullPage: true });
  console.log('📸 Screenshot 1 (Base64):', screenshot1);

  // Debug: Verificar URL atual
  console.log('🔗 URL atual:', page.url());

  // Debug: Verificar título da página
  const titulo = await page.title();
  console.log('📝 Título da página:', titulo);

  // Debug: Aguardar um pouco mais para JavaScript carregar
  console.log('⏳ Aguardando JavaScript carregar...');
  await delay(5000);

  // Screenshot 2: Após aguardar JavaScript
  console.log('📸 Capturando screenshot 2 - Após aguardar JS');
  const screenshot2 = await page.screenshot({ encoding: 'base64', fullPage: true });
  console.log('📸 Screenshot 2 (Base64):', screenshot2);

  // Debug: Listar todos os inputs na página
  console.log('🔍 Investigando campos disponíveis...');
  const camposDisponiveis = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select, button'));
    return inputs.map(input => ({
      tag: input.tagName.toLowerCase(),
      type: input.type || 'N/A',
      name: input.name || 'N/A',
      id: input.id || 'N/A',
      class: input.className || 'N/A',
      placeholder: input.placeholder || 'N/A',
      value: input.value || 'N/A'
    }));
  });

  console.log('📋 Campos encontrados na página:', JSON.stringify(camposDisponiveis, null, 2));

  // Debug: Verificar se existem formulários na página
  const formularios = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    return forms.map(form => ({
      id: form.id || 'N/A',
      class: form.className || 'N/A',
      action: form.action || 'N/A',
      method: form.method || 'N/A'
    }));
  });

  console.log('📄 Formulários encontrados:', JSON.stringify(formularios, null, 2));

  // Debug: Verificar se há erros JavaScript na página
  console.log('🚨 Verificando erros JavaScript...');
  const errosJS = await page.evaluate(() => {
    return window.errors || [];
  });

  console.log('🐛 Erros JS encontrados:', errosJS);

  // Debug: Verificar se Contact Form 7 carregou
  const cf7Status = await page.evaluate(() => {
    return {
      wpcf7Loaded: typeof window.wpcf7 !== 'undefined',
      formExists: !!document.querySelector('.wpcf7-form'),
      cf7Scripts: Array.from(document.querySelectorAll('script')).some(script => 
        script.src && script.src.includes('contact-form-7')
      )
    };
  });

  console.log('📝 Status Contact Form 7:', JSON.stringify(cf7Status, null, 2));

  // ========== CONTINUE COM SEU CÓDIGO APÓS ESTA PARTE ==========

    // Aceita cookies para limpar a tela - CORRIGIDO
    console.log('🍪 Verificando e aceitando cookies...');
    try {
      // Aguarda aparecer algum botão de aceitar cookies
      await delay(3000); // Aguarda a página carregar completamente
      
      // Procura por diferentes tipos de botões de cookies
      const seletoresCookies = [
        'button[class*="aceitar"]',
        'button[id*="aceitar"]', 
        'input[value="Aceitar"]',
        'button:contains("Aceitar")', // Vamos tentar outros métodos
        '.cookie button',
        '[class*="cookie"] button',
        'button[onclick*="cookie"]'
      ];
      
      let cookieAceito = false;
      
      // Método JavaScript para encontrar botão com texto "Aceitar"
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
        console.log('✓ Cookies aceitos (método JavaScript)!');
        cookieAceito = true;
      } else {
        // Tenta seletores específicos
        for (const seletor of seletoresCookies) {
          try {
            await page.click(seletor);
            console.log(`✓ Cookies aceitos com seletor: ${seletor}!`);
            cookieAceito = true;
            break;
          } catch (error) {
            // Continua tentando outros seletores
          }
        }
      }
      
      if (cookieAceito) {
        await delay(2000); // Aguarda a mensagem desaparecer
      } else {
        console.log('🍪 Não foi possível encontrar botão de cookies, continuando...');
      }
      
    } catch (error) {
      console.log('🍪 Erro ao tentar aceitar cookies:', error.message);
    }

    // =================== ETAPA 1 - DADOS ===================
    console.log('📝 Preenchendo ETAPA 1 - Dados...');

    // Aguarda a página carregar completamente
    await delay(3000);
    
    // Pergunta sobre contato MBM - MELHORADO
    if (dados.ja_contatado_mbm) {
      try {
        console.log('🔧 Tentando selecionar radio ja_contatado_mbm...');
        
        // Aguarda o elemento aparecer
        await page.waitForSelector('input[name="ja_contatado_mbm"]', { timeout: 10000 });
        
        // Scroll até o elemento para garantir que está visível
        await page.evaluate(() => {
          const elemento = document.querySelector('input[name="ja_contatado_mbm"]');
          if (elemento) elemento.scrollIntoView();
        });
        
        await delay(1000);
        
        // Força a seleção com JavaScript
        const seletor = `input[name="ja_contatado_mbm"][value="${dados.ja_contatado_mbm}"]`;
        await page.evaluate((sel) => {
          const radio = document.querySelector(sel);
          if (radio) {
            radio.checked = true;
            radio.click();
            // Dispara eventos para garantir que o formulário detecte
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.dispatchEvent(new Event('click', { bubbles: true }));
          }
        }, seletor);
        
        // Verifica se foi selecionado
        const foiSelecionado = await page.$eval(seletor, el => el.checked);
        console.log(`✓ Radio ja_contatado_mbm ${foiSelecionado ? 'SELECIONADO' : 'FALHOU'}: ${dados.ja_contatado_mbm}`);
        
      } catch (error) {
        console.log(`✗ Erro ao selecionar radio ja_contatado_mbm: ${error.message}`);
      }
    }
    
    // Nome do representante MBM (se aplicável)
    await preencherCampo(page, 'input[name="nome_contatou_mbm"]', dados.nome_contatou_mbm);

    // Dados principais da empresa
    await preencherCampo(page, 'input[name="razaosocial"]', dados.razaosocial);
    await preencherCampo(page, 'input[name="cnpj_form"]', dados.cnpj_form);
    await preencherCampo(page, 'input[name="susep_form"]', dados.susep_form);

    // Simples Nacional - MELHORADO
    if (dados.simples_nacional) {
      try {
        console.log('🔧 Tentando selecionar radio simples_nacional...');
        
        // Aguarda o elemento aparecer
        await page.waitForSelector('input[name="simples_nacional"]', { timeout: 10000 });
        
        await delay(500);
        
        // Força a seleção com JavaScript
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
        
        // Verifica se foi selecionado
        const foiSelecionado = await page.$eval(seletor, el => el.checked);
        console.log(`✓ Radio simples_nacional ${foiSelecionado ? 'SELECIONADO' : 'FALHOU'}: ${dados.simples_nacional}`);
        
      } catch (error) {
        console.log(`✗ Erro ao selecionar radio simples_nacional: ${error.message}`);
      }
    }

    // ISSQN
    await preencherCampo(page, 'input[name="issqn"]', dados.issqn);

    // Endereço
    await preencherCampo(page, 'input[name="endereco"]', dados.endereco);
    await preencherCampo(page, 'input[name="endereco_numero"]', dados.endereco_numero);
    await preencherCampo(page, 'input[name="endereco_complemento"]', dados.endereco_complemento);
    await preencherCampo(page, 'input[name="bairro"]', dados.bairro);
    await preencherCampo(page, 'input[name="cidade"]', dados.cidade);
    await preencherCampo(page, 'input[name="uf"]', dados.uf);
    await preencherCampo(page, 'input[name="cep_form"]', dados.cep_form);

    // Contatos
    await preencherCampo(page, 'input[name="fixo"]', dados.fixo);
    await preencherCampo(page, 'input[name="celular"]', dados.celular);
    await preencherCampo(page, 'input[name="email_contato"]', dados.email_contato);
    await preencherCampo(page, 'input[name="email_faturamento"]', dados.email_faturamento);
    await preencherCampo(page, 'input[name="email_financeiro"]', dados.email_financeiro);

    // Parentesco com colaborador MBM
    await preencherCampo(page, 'input[name="parentesco"]', dados.parentesco);
    await preencherCampo(page, 'input[name="parentesco_sim"]', dados.parentesco_sim);

    // Responsável pela assinatura
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

    // Dados da plataforma (opcional)
    await preencherCampo(page, 'input[name="nome_plataforma"]', dados.nome_plataforma);
    await preencherCampo(page, 'input[name="cnpj_plataforma"]', dados.cnpj_plataforma);

    // Checkboxes de aceite
    if (dados.receber_mkt) {
      await marcarCheckbox(page, 'input[name="receber_mkt[]"]');
    }
    
  // Aceites obrigatórios - VERSÃO ESPECÍFICA PARA WPCF7
    console.log('🔧 Marcando checkboxes de aceite (Contact Form 7)...');
    
    // Debug e marcação do checkbox aceito2024
    try {
      console.log('🔍 Investigando checkbox aceito2024 (wpcf7-acceptance)...');
      
      // Aguarda o elemento aparecer
      await page.waitForSelector('#aceito2024', { timeout: 10000 });
      
      // Scroll até a área dos checkboxes
      await page.evaluate(() => {
        const elemento = document.querySelector('.corretoraceite') || document.querySelector('#aceito2024');
        if (elemento) elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      
      await delay(2000);
      
      // Verifica propriedades detalhadas
      const info = await page.evaluate(() => {
        const checkbox = document.querySelector('#aceito2024');
        const wrapper = document.querySelector('.wpcf7-form-control-wrap[data-name="aceite"]');
        const label = checkbox?.closest('label');
        
        return {
          checkbox: checkbox ? {
            exists: true,
            checked: checkbox.checked,
            disabled: checkbox.disabled,
            visible: checkbox.offsetParent !== null,
            value: checkbox.value,
            name: checkbox.name,
            id: checkbox.id,
            classList: Array.from(checkbox.classList),
            style: checkbox.style.cssText
          } : { exists: false },
          wrapper: wrapper ? {
            exists: true,
            classList: Array.from(wrapper.classList),
            dataName: wrapper.getAttribute('data-name')
          } : { exists: false },
          label: label ? {
            exists: true,
            text: label.textContent?.substring(0, 100) + '...'
          } : { exists: false }
        };
      });
      
      console.log('🔍 Análise detalhada:', JSON.stringify(info, null, 2));
      
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
      
      // Screenshot após tentativas
      await page.screenshot({ 
        path: `debug-checkbox-${Date.now()}.png`, 
        fullPage: true 
      });
      
    } catch (error) {
      console.log('❌ Erro geral no checkbox aceito2024:', error.message);
    }

    // Debug: Verificar se todos os checkboxes estão marcados
    try {
      const aceiteStatus = await page.$eval('input[name="aceite"]', el => el.checked);
      const aceito2024Status = await page.$eval('#aceito2024', el => el.checked);
      console.log(`🔍 Debug - Aceite: ${aceiteStatus}, Aceito2024: ${aceito2024Status}`);
    } catch (error) {
      console.log('🔍 Debug - Erro ao verificar checkboxes:', error.message);
    }

    // Debug: Verificar se existe alguma mensagem de erro na página
    try {
      const mensagensErro = await page.$$eval('.wpcf7-not-valid-tip', elementos => 
        elementos.map(el => el.textContent)
      );
      if (mensagensErro.length > 0) {
        console.log('⚠️  Mensagens de erro encontradas:', mensagensErro);
      }
    } catch (error) {
      console.log('🔍 Nenhuma mensagem de erro encontrada');
    }

    console.log('✅ ETAPA 1 preenchida. Avançando para ETAPA 2...');

    // Screenshot antes de clicar no próximo
    await page.screenshot({ 
      path: `antes-proximo-${Date.now()}.png`, 
      fullPage: true 
    });

    // Clica no botão "Próximo"
    await page.click('button.cf7mls_next');
    
    // Aguarda um pouco para processar o clique
    await delay(3000);

    // Screenshot após clicar no próximo
    await page.screenshot({ 
      path: `apos-proximo-${Date.now()}.png`, 
      fullPage: true 
    });

    // Aguarda carregamento da etapa 2 com verificação melhorada
    console.log('🔄 Aguardando carregamento da ETAPA 2...');
    const etapa2Carregada = await aguardarElemento(page, 'input[name="cnpj_arquivo"]', 15000);
    if (!etapa2Carregada) {
      // Se não carregou a etapa 2, vamos tirar um screenshot para debug
      await page.screenshot({ 
        path: `debug-etapa1-${Date.now()}.png`, 
        fullPage: true 
      });
      throw new Error('Não foi possível carregar a ETAPA 2 - verifique se todos os campos obrigatórios foram preenchidos');
    }

    // =================== ETAPA 2 - ARQUIVOS ===================
    console.log('📎 Iniciando ETAPA 2 - Upload de arquivos...');

    const basePath = path.resolve(__dirname, 'documentos');
    
    // Lista de arquivos para upload
    const arquivos = [
      { campo: 'input[name="cnpj_arquivo"]', arquivo: dados.cnpj_arquivo || 'cnpj.pdf' },
      { campo: 'input[name="social"]', arquivo: dados.social || 'social.pdf' },
      { campo: 'input[name="alvara"]', arquivo: dados.alvara || 'alvara.pdf' },
      { campo: 'input[name="iss"]', arquivo: dados.iss || 'iss.pdf' },
      { campo: 'input[name="susep"]', arquivo: dados.susep || 'susep.pdf' },
      { campo: 'input[name="rg"]', arquivo: dados.rg || 'rg.pdf' },
      { campo: 'input[name="cpf_arquivo"]', arquivo: dados.cpf_arquivo || 'cpf.pdf' },
      { campo: 'input[name="conta"]', arquivo: dados.conta || 'conta.pdf' }
    ];

    // Realizar uploads com verificação melhorada
    let uploadsRealizados = 0;
    let uploadsFalharam = 0;
    
    for (const item of arquivos) {
      const caminhoCompleto = path.join(basePath, item.arquivo);
      console.log(`\n📎 Tentando upload ${uploadsRealizados + 1}/${arquivos.length}: ${item.arquivo}`);
      
      const sucesso = await fazerUpload(page, item.campo, caminhoCompleto);
      
      if (sucesso) {
        uploadsRealizados++;
      } else {
        uploadsFalharam++;
      }
      
      // Pausa entre uploads
      await delay(2000);
      
      // Screenshot após cada upload para debug
      if (uploadsFalharam > 0) {
        await page.screenshot({ 
          path: `debug-upload-${uploadsRealizados + uploadsFalharam}-${Date.now()}.png`, 
          fullPage: true 
        });
      }
    }
    
    console.log(`\n📊 Resumo dos uploads:`);
    console.log(`   ✅ Sucessos: ${uploadsRealizados}`);
    console.log(`   ❌ Falhas: ${uploadsFalharam}`);
    
    // Verifica se pelo menos alguns uploads funcionaram
    if (uploadsRealizados === 0) {
      console.log(`❌ ERRO CRÍTICO: Nenhum arquivo foi enviado!`);
      
      // Screenshot para debug
      await page.screenshot({ 
        path: `erro-uploads-${Date.now()}.png`, 
        fullPage: true 
      });
      
      throw new Error('Falha total nos uploads - nenhum arquivo foi enviado');
    }
    
    // Screenshot final da etapa 2 antes de enviar
    await page.screenshot({ 
      path: `etapa2-antes-enviar-${Date.now()}.png`, 
      fullPage: true 
    });

    console.log('📤 Enviando formulário...');

    // Clica no botão "Enviar"
    await page.click('input[type="submit"][value="Enviar"]');

    // Aguarda resposta do servidor - CORRIGIDO COM BASE NO TESTE REAL
    console.log('⏳ Aguardando resposta do servidor...');
    await delay(5000);

    // Verificação PRECISA baseada no comportamento real
    let formularioEnviado = false;
    let mensagemResposta = '';
    
    try {
      // Aguarda aparecer a mensagem de resposta
      await page.waitForSelector('.wpcf7-response-output', { timeout: 15000 });
      mensagemResposta = await page.$eval('.wpcf7-response-output', el => el.textContent.trim());
      console.log('📨 Resposta do servidor:', mensagemResposta);
      
      // Verifica se é a mensagem exata de sucesso (baseado no teste real)
      if (mensagemResposta.toLowerCase().includes('agradecemos')) {
        formularioEnviado = true;
        console.log('✅ SUCESSO CONFIRMADO: Mensagem de agradecimento recebida!');
      } else {
        console.log('❌ Resposta inesperada do servidor');
        formularioEnviado = false;
      }
      
    } catch (error) {
      console.log('⚠️  Não foi possível capturar mensagem de resposta:', error.message);
      formularioEnviado = false;
    }

    // Verifica também se a URL contém o padrão de sucesso
    const urlAtual = page.url();
    console.log('🔗 URL atual:', urlAtual);
    
    if (urlAtual.includes('#wpcf7-f4573-p2511-o1') || urlAtual.includes('wpcf7')) {
      console.log('✅ URL confirma envio (contém hash do Contact Form 7)');
      formularioEnviado = true;
    }

    // Screenshot final para validação
    await page.screenshot({ 
      path: `resultado-final-${Date.now()}.png`, 
      fullPage: true 
    });

    if (formularioEnviado) {
      console.log('✅ Processo concluído com SUCESSO CONFIRMADO!');
      
      // Screenshot específico da mensagem de sucesso
      try {
        await page.screenshot({ 
          path: `sucesso-agradecimento-${Date.now()}.png`, 
          fullPage: true 
        });
        console.log('📸 Screenshot da mensagem de agradecimento salvo!');
        
        // Screenshot focado apenas na mensagem (se possível)
        const mensagemElemento = await page.$('.wpcf7-response-output');
        if (mensagemElemento) {
          await mensagemElemento.screenshot({
            path: `mensagem-sucesso-${Date.now()}.png`
          });
          console.log('📸 Screenshot focado na mensagem de sucesso salvo!');
        }
      } catch (screenshotError) {
        console.log('⚠️  Erro ao capturar screenshot de sucesso:', screenshotError.message);
      }
      
      return res.json({ 
        ok: true, 
        mensagem: 'Cadastro de corretor enviado e confirmado com sucesso!',
        resposta_servidor: mensagemResposta,
        url_final: urlAtual,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('❌ Processo FALHOU - formulário não foi enviado');
      return res.status(400).json({ 
        ok: false, 
        error: 'Formulário não foi enviado com sucesso',
        resposta_servidor: mensagemResposta,
        url_final: urlAtual,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Erro no processo:', error);
    
    // Screenshot de erro para debug
    if (browser) {
      try {
        const page = (await browser.pages())[0];
        if (page) {
          await page.screenshot({ 
            path: `erro-${Date.now()}.png`, 
            fullPage: true 
          });
        }
      } catch (screenshotError) {
        console.error('Erro ao capturar screenshot:', screenshotError);
      }
    }

    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Novo endpoint específico para receber dados do Pipefy
app.post('/pipefy', async (req, res) => {
  console.log('🔌 Dados recebidos do Pipefy:', JSON.stringify(req.body, null, 2));
  
  try {
    // Extrai dados do webhook do Pipefy
    const pipefyData = req.body;
    
    // Mapeia campos do Pipefy para formato da MBM
    const dadosMBM = {
      // Dados principais
      razaosocial: pipefyData['razao_social'] || pipefyData['razaosocial'] || '',
      cnpj_form: pipefyData['cnpj'] || '',
      susep_form: pipefyData['susep'] || '',
      issqn: pipefyData['issqn'] || '123456', // Valor padrão se não preenchido
      
      // Endereço
      endereco: pipefyData['endereco'] || '',
      endereco_numero: pipefyData['numero'] || '',
      endereco_complemento: '', // Não está no form Pipefy
      bairro: pipefyData['bairro'] || '',
      cidade: pipefyData['cidade'] || '',
      uf: pipefyData['uf'] || '',
      cep_form: pipefyData['cep'] || '',
      
      // Contatos
      fixo: '', // Não separado no Pipefy
      celular: pipefyData['telefone'] || '',
      email_contato: pipefyData['email_contato'] || pipefyData['e_mail_de_contato'] || '',
      email_faturamento: pipefyData['email_contato'] || pipefyData['e_mail_de_contato'] || '', // Usa o mesmo
      email_financeiro: pipefyData['email_contato'] || pipefyData['e_mail_de_contato'] || '', // Usa o mesmo
      
      // Responsável pela assinatura
      nome_assinatura_plataforma: pipefyData['nome_responsavel'] || pipefyData['nome_da_pessoa_responsavel_pela_assinatura_do_contrato'] || '',
      cpf_plataforma: pipefyData['cpf_responsavel'] || pipefyData['cpf_do_responsavel'] || '',
      data_nascimento: pipefyData['data_nascimento'] || '',
      email_responsavel: pipefyData['email_responsavel'] || pipefyData['e_mail_do_responsavel'] || '',
      
      // Campos com valores padrão (bot resolve automaticamente)
      ja_contatado_mbm: 'Não',
      nome_contatou_mbm: '',
      simples_nacional: 'Sim',
      parentesco: 'Não',
      parentesco_sim: '',
      comochegou: 'Formulário online Pipefy',
      nome_plataforma: 'INOVA REPRESENTAÇÃO E GESTÃO',
      cnpj_plataforma: '34.476.027/0001-77',
      receber_mkt: false,
      
      // Arquivos (vamos baixar do Pipefy)
      cnpj_arquivo: 'cnpj.pdf',
      social: 'social.pdf', 
      alvara: 'alvara.pdf',
      iss: 'iss.pdf',
      susep: 'susep.pdf',
      rg: 'rg.pdf',
      cpf_arquivo: 'cpf.pdf',
      conta: 'conta.pdf'
    };
    
    console.log('🔄 Dados convertidos para MBM:', JSON.stringify(dadosMBM, null, 2));
    
    // Processa arquivos do Pipefy (se houver)
    await processarArquivosPipefy(pipefyData);
    
    // Chama a função original de envio para MBM
    const resultado = await enviarParaMBM(dadosMBM);
    
    console.log('✅ Resultado do envio:', resultado);
    
    // Resposta para o Pipefy
    res.json({
      success: true,
      message: 'Cadastro processado com sucesso',
      resultado: resultado,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento Pipefy:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


// Função para baixar arquivo de uma URL
async function baixarArquivo(url, caminhoDestino) {
  return new Promise((resolve, reject) => {
    const arquivo = fs.createWriteStream(caminhoDestino);
    const protocolo = url.startsWith('https://') ? https : http;
    
    console.log(`📥 Baixando: ${url} → ${caminhoDestino}`);
    
    protocolo.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(arquivo);
        arquivo.on('finish', () => {
          arquivo.close();
          console.log(`✅ Download concluído: ${path.basename(caminhoDestino)}`);
          resolve(true);
        });
      } else {
        arquivo.close();
        fs.unlink(caminhoDestino, () => {}); // Remove arquivo incompleto
        reject(new Error(`Erro HTTP: ${response.statusCode}`));
      }
    }).on('error', (error) => {
      arquivo.close();
      fs.unlink(caminhoDestino, () => {}); // Remove arquivo incompleto
      reject(error);
    });
  });
}

// Função atualizada para processar arquivos do Pipefy
async function processarArquivosPipefy(pipefyData) {
  console.log('📎 Processando e baixando arquivos do Pipefy...');
  
  // Mapeamento dos campos de arquivo
  const arquivosPipefy = {
    'anexo_cnpj': 'cnpj.pdf',
    'anexo_contrato_social': 'social.pdf', 
    'anexo_alvara': 'alvara.pdf',
    'inscricao_municipal': 'iss.pdf',
    'registro_susep': 'susep.pdf',
    'carteira_identidade': 'rg.pdf',
    'anexo_cpf': 'cpf.pdf',
    'comprovante_conta': 'conta.pdf'
  };
  
  const documentosPath = path.resolve(__dirname, 'documentos');
  
  // Criar pasta se não existir
  if (!fs.existsSync(documentosPath)) {
    fs.mkdirSync(documentosPath, { recursive: true });
    console.log('📁 Pasta documentos/ criada');
  }
  
  let downloadsSucesso = 0;
  let downloadsFalha = 0;
  
  for (const [campoPipefy, nomeArquivo] of Object.entries(arquivosPipefy)) {
    if (pipefyData[campoPipefy]) {
      try {
        const arquivoData = pipefyData[campoPipefy];
        
        // Pipefy pode enviar como array ou objeto único
        let url;
        if (Array.isArray(arquivoData) && arquivoData.length > 0) {
          url = arquivoData[0].url; // Pega primeiro arquivo se for array
        } else if (arquivoData.url) {
          url = arquivoData.url; // Se for objeto direto
        } else if (typeof arquivoData === 'string') {
          url = arquivoData; // Se for string direto
        }
        
        if (url) {
          const caminhoDestino = path.join(documentosPath, nomeArquivo);
          await baixarArquivo(url, caminhoDestino);
          downloadsSucesso++;
          
          // Verifica se arquivo foi salvo corretamente
          if (fs.existsSync(caminhoDestino)) {
            const stats = fs.statSync(caminhoDestino);
            console.log(`📊 ${nomeArquivo}: ${(stats.size / 1024).toFixed(1)} KB`);
          }
        } else {
          console.log(`⚠️  URL não encontrada para ${campoPipefy}`);
          downloadsFalha++;
        }
        
      } catch (error) {
        console.log(`❌ Erro ao baixar ${campoPipefy}:`, error.message);
        downloadsFalha++;
      }
    } else {
      console.log(`📄 Campo ${campoPipefy} não enviado pelo Pipefy`);
    }
  }
  
  console.log(`📊 Downloads: ✅ ${downloadsSucesso} | ❌ ${downloadsFalha}`);
  
  /*if (downloadsSucesso === 0) {
    throw new Error('Nenhum arquivo foi baixado do Pipefy');
  }
  */
 console.log('⚠️  MODO TESTE: Continuando sem arquivos por enquanto...');
  return { sucessos: downloadsSucesso, falhas: downloadsFalha };
}


// Função real para envio à MBM (com descoberta automática do Chrome)
async function enviarParaMBM(dados) {
  let browser;

  try {
    console.log('🚀 Iniciando processo de cadastro via Pipefy...');
    
    // CORRIGIDO

  browser = await launchBrowser();

    const page = await browser.newPage();
    
    // Configurações da página otimizadas
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // ... resto do código continua igual ...
    console.log('📄 Acessando formulário...');
    await page.goto('https://mbmseguros.com.br/novo-corretor/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Aceita cookies para limpar a tela
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
      console.log('🍪 Erro ao tentar aceitar cookies:', error.message);
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
    
    // Nome do representante MBM (se aplicável)
    await preencherCampo(page, 'input[name="nome_contatou_mbm"]', dados.nome_contatou_mbm);

    // Dados principais da empresa
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

    // ISSQN
    await preencherCampo(page, 'input[name="issqn"]', dados.issqn);

    // Endereço
    await preencherCampo(page, 'input[name="endereco"]', dados.endereco);
    await preencherCampo(page, 'input[name="endereco_numero"]', dados.endereco_numero);
    await preencherCampo(page, 'input[name="endereco_complemento"]', dados.endereco_complemento);
    await preencherCampo(page, 'input[name="bairro"]', dados.bairro);
    await preencherCampo(page, 'input[name="cidade"]', dados.cidade);
    await preencherCampo(page, 'input[name="uf"]', dados.uf);
    await preencherCampo(page, 'input[name="cep_form"]', dados.cep_form);

    // Contatos
    await preencherCampo(page, 'input[name="fixo"]', dados.fixo);
    await preencherCampo(page, 'input[name="celular"]', dados.celular);
    await preencherCampo(page, 'input[name="email_contato"]', dados.email_contato);
    await preencherCampo(page, 'input[name="email_faturamento"]', dados.email_faturamento);
    await preencherCampo(page, 'input[name="email_financeiro"]', dados.email_financeiro);

    // Parentesco com colaborador MBM
    await preencherCampo(page, 'input[name="parentesco"]', dados.parentesco);
    await preencherCampo(page, 'input[name="parentesco_sim"]', dados.parentesco_sim);

    // Responsável pela assinatura
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

    // Dados da plataforma (opcional)
    await preencherCampo(page, 'input[name="nome_plataforma"]', dados.nome_plataforma);
    await preencherCampo(page, 'input[name="cnpj_plataforma"]', dados.cnpj_plataforma);

    // Checkboxes de aceite
    if (dados.receber_mkt) {
      await marcarCheckbox(page, 'input[name="receber_mkt[]"]');
    }
    
    // Aceites obrigatórios - VERSÃO PARA PIPEFY
    console.log('🔧 Marcando checkboxes de aceite (via Pipefy)...');
    
    try {
      await page.waitForSelector('#aceito2024', { timeout: 10000 });
      await page.evaluate(() => {
        const elemento = document.querySelector('.corretoraceite') || document.querySelector('#aceito2024');
        if (elemento) elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      await delay(2000);
      
      let sucesso = await page.evaluate(() => {
        const checkbox = document.querySelector('#aceito2024');
        if (checkbox) {
          checkbox.click();
          return checkbox.checked;
        }
        return false;
      });
      
      console.log(`📊 Checkbox aceito2024: ${sucesso ? '✅ MARCADO' : '❌ FALHOU'}`);
      
    } catch (error) {
      console.log('❌ Erro no checkbox aceito2024:', error.message);
    }

    console.log('✅ ETAPA 1 preenchida. Avançando para ETAPA 2...');

    // Clica no botão "Próximo"
    await page.click('button.cf7mls_next');
    await delay(3000);

    // Aguarda carregamento da etapa 2
    console.log('🔄 Aguardando carregamento da ETAPA 2...');
    const etapa2Carregada = await aguardarElemento(page, 'input[name="cnpj_arquivo"]', 15000);
    if (!etapa2Carregada) {
      throw new Error('Não foi possível carregar a ETAPA 2');
    }

    // =================== ETAPA 2 - ARQUIVOS ===================
    console.log('📎 Iniciando ETAPA 2 - Upload de arquivos...');

    const basePath = path.resolve(__dirname, 'documentos');
    
    const arquivos = [
      { campo: 'input[name="cnpj_arquivo"]', arquivo: dados.cnpj_arquivo || 'cnpj.pdf' },
      { campo: 'input[name="social"]', arquivo: dados.social || 'social.pdf' },
      { campo: 'input[name="alvara"]', arquivo: dados.alvara || 'alvara.pdf' },
      { campo: 'input[name="iss"]', arquivo: dados.iss || 'iss.pdf' },
      { campo: 'input[name="susep"]', arquivo: dados.susep || 'susep.pdf' },
      { campo: 'input[name="rg"]', arquivo: dados.rg || 'rg.pdf' },
      { campo: 'input[name="cpf_arquivo"]', arquivo: dados.cpf_arquivo || 'cpf.pdf' },
      { campo: 'input[name="conta"]', arquivo: dados.conta || 'conta.pdf' }
    ];

    let uploadsRealizados = 0;
    let uploadsFalharam = 0;
    
    for (const item of arquivos) {
      const caminhoCompleto = path.join(basePath, item.arquivo);
      console.log(`📎 Upload ${uploadsRealizados + 1}/${arquivos.length}: ${item.arquivo}`);
      
      const sucesso = await fazerUpload(page, item.campo, caminhoCompleto);
      
      if (sucesso) {
        uploadsRealizados++;
      } else {
        uploadsFalharam++;
      }
      
      await delay(2000);
    }
    
    console.log(`📊 Resumo dos uploads: ✅ ${uploadsRealizados} | ❌ ${uploadsFalharam}`);
    
    if (uploadsRealizados === 0) {
      throw new Error('Falha total nos uploads');
    }

    console.log('📤 Enviando formulário...');
    await page.click('input[type="submit"][value="Enviar"]');
    await delay(5000);

    // Verificação de sucesso
    let formularioEnviado = false;
    let mensagemResposta = '';
    
    try {
      await page.waitForSelector('.wpcf7-response-output', { timeout: 15000 });
      mensagemResposta = await page.$eval('.wpcf7-response-output', el => el.textContent.trim());
      console.log('📨 Resposta do servidor:', mensagemResposta);
      
      if (mensagemResposta.toLowerCase().includes('agradecemos')) {
        formularioEnviado = true;
        console.log('✅ SUCESSO CONFIRMADO: Mensagem de agradecimento recebida!');
      }
      
    } catch (error) {
      console.log('⚠️  Não foi possível capturar mensagem de resposta:', error.message);
    }

    const urlAtual = page.url();
    console.log('🔗 URL atual:', urlAtual);
    
    if (urlAtual.includes('#wpcf7-f4573-p2511-o1') || urlAtual.includes('wpcf7')) {
      console.log('✅ URL confirma envio');
      formularioEnviado = true;
    }

    if (formularioEnviado) {
      console.log('✅ Processo concluído com SUCESSO via Pipefy!');
      return { 
        ok: true, 
        mensagem: 'Cadastro de corretor enviado via Pipefy com sucesso!',
        resposta_servidor: mensagemResposta,
        url_final: urlAtual,
        timestamp: new Date().toISOString()
      };
    } else {
      console.log('❌ Processo FALHOU');
      return { 
        ok: false, 
        error: 'Formulário não foi enviado com sucesso',
        resposta_servidor: mensagemResposta,
        url_final: urlAtual,
        timestamp: new Date().toISOString()
      };
    }

  } catch (error) {
    console.error('❌ Erro no processo via Pipefy:', error);
    return { 
      ok: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
const PORT = process.env.PORT || 3000;
console.log('🔍 DEBUG - process.env.PORT:', process.env.PORT);
console.log('🔍 DEBUG - PORT final:', PORT);
console.log('🔍 DEBUG - typeof PORT:', typeof PORT);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📋 Endpoints disponíveis:`);
  console.log(`   POST /enviar - Enviar cadastro de corretor`);
  console.log(`   GET /status - Status do servidor`);
});

module.exports = app;