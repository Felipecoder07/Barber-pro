const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/servicesController');

// Rota pública: Obter todos os serviços ativos
router.get('/', servicesController.getActiveServices);

module.exports = router;
