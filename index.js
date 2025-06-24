const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json()); // recebe JSON no body

app.post('/enviar', async (req, res) => {
  const { nome_completo, email } = req.body;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://mbmseguros.com.br/novo-corretor/', { waitUntil: 'networkidle2' });

    // Preenche os campos básicos
    await page.type('input[name="nome_completo"]', nome_completo || 'Teste');
    await page.type('input[name="email"]', email || 'teste@teste.com');

    // Preenche os campos da assessoria
    await page.type('input[name="nome_plataforma"]', 'Nossa Assessoria');
    await page.type('input[name="cnpj_plataforma"]', '12.345.678/0001-99');

    // Você pode continuar com outros campos conforme necessário

    res.json({ ok: true, message: 'Formulário preenchido no navegador com sucesso.' });

  } catch (err) {
    console.error('Erro ao preencher:', err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
