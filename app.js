const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('✅ Servidor simples online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Testando: Servidor rodando na porta ${PORT}`);
});
