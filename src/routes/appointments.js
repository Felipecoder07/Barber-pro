const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');

// Consultar disponibilidade para um dado dia e serviço
router.get('/availability', appointmentsController.getAvailability);

// Criar agendamento (trata concorrência RG08)
router.post('/', appointmentsController.createAppointment);

// Cancelar agendamento (trata antecedência RG03)
router.put('/:id/cancel', appointmentsController.cancelAppointment);

module.exports = router;
