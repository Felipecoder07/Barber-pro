require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const servicesRoutes = require('./routes/services');
const appointmentsRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança e configuração
app.use(helmet());
app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos do frontend (que estão na raiz ou em public)
app.use(express.static(path.join(__dirname, '../../soft barbaearia'))); // Ajuste temporário já que o HTML está na raiz

// Rotas da API
app.use('/api/services', servicesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin', adminRoutes);

// Tratamento de rotas não encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('Erro na API:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
